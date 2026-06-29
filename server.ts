import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // Initialize Gemini server-side using GEMINI_API_KEY
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Warning: GEMINI_API_KEY is not defined in environment variables.");
  }
  const ai = new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Robust helper to generate text content with auto-retry and sequential model fallback
  async function generateContentWithFallback(options: {
    contents: any[];
    systemInstruction?: string;
    temperature?: number;
  }) {
    // Sequence of models to try in case of 503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED or other failures.
    // We prioritize gemini-3.5-flash as the primary recommended model, with robust fallbacks.
    const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];
    let lastError = null;

    for (const model of models) {
      let attempts = 3;
      while (attempts > 0) {
        try {
          console.log(`[LexAI API] Attempting generateContent using model: ${model} (${attempts} attempts remaining)`);
          const response = await ai.models.generateContent({
            model: model,
            contents: options.contents,
            config: {
              systemInstruction: options.systemInstruction,
              temperature: options.temperature,
            }
          });
          
          if (response && response.text) {
            console.log(`[LexAI API] Successfully generated content using model: ${model}`);
            return response;
          }
          throw new Error("Received empty text response from model");
        } catch (err: any) {
          lastError = err;
          const status = err.status || (err.error && err.error.status);
          const code = err.code || (err.error && err.error.code);
          const message = err.message || "";

          // We log this as a warning instead of a fatal error because our sequential model fallback will handle it.
          console.warn(`[LexAI API] Model ${model} is temporarily unavailable or limited (code ${code || status}). Switching to fallback...`);

          const isTransient = 
            status === "UNAVAILABLE" || 
            code === 503 || 
            message.includes("503") ||
            message.includes("high demand") ||
            message.includes("temporary");

          // Note: status === "RESOURCE_EXHAUSTED" / 429 indicates rate/quota limits.
          // In that case, we must NOT retry the same model immediately, we should switch to the fallback model right away!
          const isQuotaExceeded =
            status === "RESOURCE_EXHAUSTED" ||
            code === 429 ||
            message.includes("quota") ||
            message.includes("Rate limit") ||
            message.includes("RESOURCE_EXHAUSTED") ||
            message.includes("429");

          if (isTransient && attempts > 1) {
            attempts--;
            console.log(`[LexAI API] Retrying ${model} after a brief wait...`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            if (isQuotaExceeded) {
              console.log(`[LexAI API] Quota/Rate limit (429) hit on ${model}. Switching immediately to fallback model.`);
            } else {
              console.log(`[LexAI API] Model ${model} not available. Trying next model.`);
            }
            break; // Stop retrying this model, proceed to fallback model
          }
        }
      }
    }
    throw lastError || new Error("All model fallback paths exhausted.");
  }

  // Multilingual prompt helper for LexAI
  function getSystemInstruction(mode: string, language: string): string {
    if (mode === 'serious') {
      switch (language) {
        case 'hausa':
          return "You are a professional Nigerian Legal Assistant. Provide strictly formal, accurate legal advice in formal Hausa language, citing the Nigerian Constitution and Acts. Maintain a professional, empathetic tone. Answer the user's questions clearly.";
        case 'igbo':
          return "You are a professional Nigerian Legal Assistant. Provide strictly formal, accurate legal advice in formal Igbo language, citing the Nigerian Constitution and Acts. Maintain a professional, empathetic tone. Answer the user's questions clearly.";
        case 'yoruba':
          return "You are a professional Nigerian Legal Assistant. Provide strictly formal, accurate legal advice in formal Yoruba language, citing the Nigerian Constitution and Acts. Maintain a professional, empathetic tone. Answer the user's questions clearly.";
        default:
          return "You are a professional Nigerian Legal Assistant. Provide strictly formal, accurate legal advice citing the Nigerian Constitution and Acts. Do not use Pidgin or jokes. Maintain a professional, empathetic tone.";
      }
    } else {
      switch (language) {
        case 'hausa':
          return "You are LexAI, a funny Nigerian lawyer (Your Legal Padi). Speak in a lighthearted, street-smart Hausa with a friendly 'Legal Padi' attitude (funny Nigerian lawyer style), sometimes mixing in common English/Pidgin phrases. Give practical legal advice mixed with 'cruise' (humor). Keep responses relatively short and conversational. Always sound confident.";
        case 'igbo':
          return "You are LexAI, a funny Nigerian lawyer (Your Legal Padi). Speak in a street-smart, engaging, and friendly Igbo with a funny 'Legal Padi' attitude, sometimes mixing in common English/Pidgin phrases. Give practical legal advice mixed with 'cruise' (humor). Keep responses relatively short and conversational. Always sound confident.";
        case 'yoruba':
          return "You are LexAI, a funny Nigerian lawyer (Your Legal Padi). Speak in a street-smart, respectful yet funny Yoruba with a friendly 'Legal Padi' attitude (humorous Nigerian lawyer style), sometimes mixing in common English/Pidgin phrases. Give practical legal advice mixed with 'cruise' (humor). Keep responses relatively short and conversational. Always sound confident.";
        default:
          return "You are LexAI, a funny Nigerian lawyer (Your Legal Padi). You speak in Nigerian Pidgin English. You are street-wise, hilarious, and give practical legal advice mixed with 'cruise' (humor). Keep responses relatively short and conversational. Always sound confident.";
      }
    }
  }

  // API Route for LexAI Chat
  app.post("/api/lexai/chat", async (req, res) => {
    const { message, history, mode, language = "english_pidgin" } = req.body;
    try {
      const systemInstruction = getSystemInstruction(mode, language);

      // Convert history to Gemini format
      const contents = history.map((msg: any) => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await generateContentWithFallback({
        contents: contents,
        systemInstruction: systemInstruction,
        temperature: mode === 'cruise' ? 0.8 : 0.3,
      });

      res.json({ text: response.text || "Ah, network small wahala. Abeg try asking again." });
    } catch (error: any) {
      console.warn("Chat API error (activating smart client-side fallback):", error);
      
      // Smart Fallback Rule Engine for LexAI
      const normalizedMsg = (message || "").toLowerCase();
      let reply = "";

      if (mode === 'serious') {
        // Formal Fallbacks
        if (normalizedMsg.includes("police") || normalizedMsg.includes("arrest") || normalizedMsg.includes("search") || normalizedMsg.includes("bail") || normalizedMsg.includes("officer")) {
          if (language === 'hausa') {
            reply = `Abubuwan da ya kamata ku sani game da haƙƙoƙinku lokacin da kuke hulɗa da 'yan sanda a Najeriya:
1. Haƙƙin yin shiru (Sashi na 35(2) na Kundin Tsarin Mulki): Kuna da cikakken haƙƙin kin amsa kowace tambaya har sai lauyanku ya hallara.
2. Belin kyauta ne: Sashi na 35 na Kundin Tsarin Mulki ya tabbatar da cewa belin suspects kyauta ne 100%. Kada ku biya kuɗi a ofishin 'yan sanda.
3. Binciken wayar hannu: Jami'an 'yan sanda ba su da ikon bincika wayarku ko kwamfutarku ba tare da takardar izini ta musamman (warrant) ba.`;
          } else if (language === 'igbo') {
            reply = `Ihe ndị dị mkpa ị ga-amata gbasara ikike gị n'aka ndị uwe ojii na Naịjirịa:
1. Ikike ịgbachi nkịtị (Nkebi nke 35(2) nke Usoro Iwu): I nwere ikike ịghara ịza ajụjụ ọ bụla ruo mgbe onye ọka iwu gị bịara.
2. Mgbapụta (Bail) bụ n'efu: Iwu Naịjirịa sọrọ mgbapụta bụ n'efu. Agbala mbọ kwụọ onye ọ bụla ego na ụlọ ọrụ ndị uwe ojii.
3. Inyocha ekwentị: Ndị uwe ojii enweghị ikike inyocha ekwentị gị ma ọ bụrụ na ha enweghị akwụkwọ ikike (warrant) sitere n'aka ụlọ ikpe.`;
          } else if (language === 'yoruba') {
            reply = `Àwọn ohun pàtàkì tí ẹ gbọ́dọ̀ mọ̀ nípa ẹ̀tọ́ yín pẹ̀lú àwọn ọlọ́pàá ní Orílẹ̀-èdè Nàìjíríà:
1. Ẹ̀tọ́ láti dákẹ́ (Abala 35(2) ti Òfin Orílẹ̀-èdè): Ẹ ní ẹ̀tọ́ kíkún láti dákẹ́ láì dáhùn ìbéèrè kankan títí tí agbẹjọ́rò yín yóò fi dé.
2. Ìdásílẹ̀ (Bail) jẹ́ ọ̀fẹ́: Ní abẹ́ òfin Orílẹ̀-èdè Nàìjíríà, ìdásílẹ̀ lórí fura jẹ́ ọ̀fẹ́ 100%. Ẹ má ṣe sanwó kankan ní àgọ́ ọlọ́pàá.
3. Ìyọnu lórí ẹ̀rọ alágbèéká (Phone Search): Awọn ọlọ́pàá kò ní ẹ̀tọ́ láti wá nǹkan nínú foonu yín láìsí àṣẹ láti ọ̀dọ̀ ilé-ẹjọ́ (warrant).`;
          } else {
            reply = `Here is professional legal guidance regarding your rights with law enforcement in Nigeria:
1. Right to Remain Silent: Under Section 35(2) of the 1999 Constitution of Nigeria, you have the right to remain silent and not answer any questions until your legal counsel is present.
2. Bail is Free: Under Nigerian law, suspect bail is free. Demanding payment for bail at a police station is unlawful.
3. Search Warrant: Security personnel cannot search your digital devices (phones or laptops) without a specific judicial warrant or authorization.`;
          }
        } else if (normalizedMsg.includes("landlord") || normalizedMsg.includes("tenant") || normalizedMsg.includes("rent") || normalizedMsg.includes("evict") || normalizedMsg.includes("quit")) {
          if (language === 'hausa') {
            reply = `Shawarwari ga masu hayar gida a Najeriya:
1. Sanarwa ta kora (Quit Notice): Mai gida ba zai iya korar ku ba ba tare da ba ku sanarwa ta hukuma ba (yawanci watanni 6 ga masu hayar shekara).
2. Sashi na 7 na dokar hayar gida: Bayan sanarwar kora ta cika, mai gida dole ne ya ba ku sanarwar kwanaki 7 na aniyar kwato gidan kafin ya kai ku kotu. Kaddara da cire rufin gida ko kora ta karfi ya saba wa doka.`;
          } else if (language === 'igbo') {
            reply = `Ndụmọdụ maka ndị bi na ranti na Naịjirịa:
1. Akwụkwọ ọkwa ịchụpụ (Quit Notice): Onye nwe ụlọ enweghị ike ịchụpụ gị n'ụlọ ma ọ bụrụ na o nyeghị gị akwụkwọ ọkwa kwesịrị ekwesị (ọnwa isii maka ndị na-akwụ ụgwọ kwa afọ).
2. Iwu ịchụpụ n'ụlọ: Ọ bụ naanị ụlọ ikpe nwere ike inye iwu ka a chụpụ gị. Iji aka ike chụpụ mmadụ ma ọ bụ iwepụ elu ụlọ bụ ihe megidere iwu.`;
          } else if (language === 'yoruba') {
            reply = `Ìmọ̀ràn lábẹ́ òfin fún àwọn olùgbé ilé ranti ní Orílẹ̀-èdè Nàìjíríà:
1. Ìwé ikúkọ̀ silẹ̀ (Quit Notice): Onílé yín kò lè lé yín jáde láì fún yín ní ìwé ìkìlọ̀ tí ó tọ́ (oṣù mẹ́fà fún àwọn tó ń sanwó lọ́dọọdún).
2. Òfin Agbára Káká (Self-help): Ó lòdì sí òfin fún onílé láti bẹ̀rẹ̀ sí yọ bọ́ọ̀dù orí ilé, yọ ilẹ̀kùn, tàbí lo ipá kankan. Ilé-ẹjọ́ nìkan ló lè lé ènìyàn jáde.`;
          } else {
            reply = `Here is a professional legal overview of landlord-tenant rights in Nigeria:
1. Recovery of Premises: A landlord cannot lawfully evict a tenant without serving appropriate statutory notices. For a yearly tenant, a 6-month Notice to Quit must be served.
2. 7 Days Notice of Owner's Intention: After the expiration of the Notice to Quit, a further 7-day Notice of Owner's Intention to Recover Possession must be served prior to launching court proceedings.
3. Self-Help Prohibited: Landlords are strictly prohibited from engaging in "self-help" measures, such as locking out the tenant, removing doors or roofs, or resorting to physical force.`;
          }
        } else {
          // General Serious fallback
          if (language === 'hausa') {
            reply = `Ina ba ku shawara ku kiyaye waɗannan muhimman abubuwa:
1. Koyaushe ku nemi rubutacciyar yarjejeniya a duk wata ma'amala da za ku yi.
2. Kada ku sanya hannu kan kowane takarda ba tare da kun karanta shi da kyau ba.
3. Koma ga ƙwararren lauya don ƙarin haske na musamman game da matsalarku.`;
          } else if (language === 'igbo') {
            reply = `M na-adụ gị ọdụ ka ị cheta ihe ndị a dị mkpa gbasara iwu:
1. Hụ na i nwere ihe edere ede na nkwekọrịta ọ bụla ị na-eme.
2. Atakwala aka n'akwụkwọ ọ bụla ọ gwụla ma i gụchara ya nke ọma.
3. Gakwuru ọkachamara ọkàiwu maka ndụmọdụ doro anya banyere okwu gị.`;
          } else if (language === 'yoruba') {
            reply = `Mo gbà yín nímọ̀ràn láti tẹ̀lé àwọn ìlànà wọ̀nyí:
1. Ẹ rí i pé ẹ ní ìwé àkọsílẹ̀ lórí gbogbo àdéhùn tí ẹ bá ń ṣe pẹ̀lú ènìyàn.
2. Ẹ má ṣe tọwọ́ bọ̀wé kankan láì ka àti láì mọ ohun tí ó wà nínú rẹ̀ dájú.
3. Ẹ kàn sí agbẹjọ́rò tí ó kúnjú òṣùwọ̀n fún ìrànlọ́wọ́ kí ẹ tó gbé ìgbésẹ̀ kankan.`;
          } else {
            reply = `Please note the following key legal recommendations for your protection under Nigerian law:
1. Written Evidence: Always ensure that all commercial, personal, or tenancy agreements are documented in writing and signed by both parties.
2. Review Before Signing: Never execute or sign any contract or legal document without carefully reading and understanding every single clause.
3. Professional Assistance: Consult a qualified legal practitioner to review your specific situation and protect your rights effectively.`;
          }
        }
      } else {
        // Cruise/Pidgin/Street-Smart Fallbacks
        if (normalizedMsg.includes("police") || normalizedMsg.includes("arrest") || normalizedMsg.includes("search") || normalizedMsg.includes("bail") || normalizedMsg.includes("officer")) {
          reply = `**Cruise Summary**: Guy, relax first! Police wahala no be end of the world. Calm down, cooperate, but know your rights!

**Legal Backing**: Section 35 and 37 of the 1999 Constitution of Nigeria.

**Steps You Fit Take**:
1. No argue or shout with officers on duty. De-escalate the matter, ego no dey save suspect.
2. Politely ask for search warrant if they want to enter your house or search your phone. Under Nigerian law, they cannot search your phone anyhow without a clear court warrant!
3. Bail is 100% free! If they demand money, tell them you don't have cash and immediately request to contact your lawyer or family.

**Street Tips**: Stay alive first. Note the officer's name, badge number, or vehicle plate number. Quiet mouth no dey catch fly!

**Confidence Level**: High`;
        } else if (normalizedMsg.includes("landlord") || normalizedMsg.includes("tenant") || normalizedMsg.includes("rent") || normalizedMsg.includes("evict") || normalizedMsg.includes("quit")) {
          reply = `**Cruise Summary**: Calm down! Landlord no get power or legal right to carry your load throw out because rent expire. Law dey protect you!

**Legal Backing**: Recovery of Premises Laws / State Tenancy Acts.

**Steps You Fit Take**:
1. If your rent expire, landlord must give you official 'Notice to Quit'. For yearly tenant, the notice must be 6 full months!
2. After Quit Notice expire, they must still serve you another 7 days 'Notice of Owner\'s Intention to Recover Possession' before they fit carry you go court.
3. No let landlord use self-help like removing your roof, locking your gate, or disconnecting light. That is illegal! If they do it, report them straight to police or mediation centers.

**Street Tips**: Keep copies of all rent receipts. Record any threats or illegal actions with your phone. 

**Confidence Level**: High`;
        } else if (normalizedMsg.includes("salary") || normalizedMsg.includes("boss") || normalizedMsg.includes("work") || normalizedMsg.includes("job") || normalizedMsg.includes("dismiss")) {
          reply = `**Cruise Summary**: No let boss put sand for your garri! Salary be your right, not a favor or dash. 

**Legal Backing**: Section 15 of the Labour Act of Nigeria.

**Steps You Fit Take**:
1. Check your employment letter or contract details to confirm salary payment terms and agreement.
2. Write an official demand letter to your employer demanding outstanding salaries. Keep copies!
3. If they sack you without following contract terms, you fit claim damages for wrongful termination in Industrial Court.

**Street Tips**: Always document everything! Emails, chats, timesheets. No delete evidence because of vex.

**Confidence Level**: High`;
        } else if (normalizedMsg.includes("wife") || normalizedMsg.includes("husband") || normalizedMsg.includes("marry") || normalizedMsg.includes("divorce") || normalizedMsg.includes("child") || normalizedMsg.includes("custody")) {
          reply = `**Cruise Summary**: Love is sweet, but law is strict! Let's look at this family matter with a calm head.

**Legal Backing**: Matrimonial Causes Act of Nigeria.

**Steps You Fit Take**:
1. For statutory marriages (Registry), divorce is not instant. You must prove to the court that the marriage has broken down irretrievably (e.g. living apart for 2-3 years, or adultery).
2. For child custody, court always prioritizes the "best interest of the child". If the child is very young, mother usually gets custody unless she is proven unfit.
3. Try to discuss mediation or out-of-court settlements first before doing court war.

**Street Tips**: Don't use your children as weapons. Keep calm and talk to a family lawyer to draft a peaceful settlement.

**Confidence Level**: Medium`;
        } else if (normalizedMsg.includes("scam") || normalizedMsg.includes("fraud") || normalizedMsg.includes("money") || normalizedMsg.includes("bank") || normalizedMsg.includes("cheat")) {
          reply = `**Cruise Summary**: Ah! Scheme and scam artists everywhere. Calm down make we track them.

**Legal Backing**: Cybercrimes Act & Criminal Code.

**Steps You Fit Take**:
1. Act fast! Immediately contact your bank to report the transaction. Request a "Post No Debit" (PND) on the fraudster's account to freeze the money.
2. Head to the nearest police station or EFCC / SFU office to write an official statement.
3. Keep all chat screenshots, bank transfer receipts, and the fraudster's account number safe.

**Street Tips**: Once you smell scam, don't argue with them. Run to bank first. Speed is everything!

**Confidence Level**: High`;
        } else {
          // General Cruise fallback
          reply = `**Cruise Summary**: Calm down first! Your Legal Padi is here. Your matter get head and leg, no need to panic.

**Legal Backing**: Nigerian Constitution & Common Law of Nigeria.

**Steps You Fit Take**:
1. Always make sure you get written agreements for anything that involves money, land, or work. Voice note no be contract!
2. No sign any document if you never read and understand am 100%. If dem dey rush you, say NO!
3. Talk to a legal practitioner before you take any big step. Let professional look at the details.

**Street Tips**: Quiet mouth no dey catch fly, but too much talk fit land you inside trouble. Know when to hold your peace and let your lawyer talk.

**Confidence Level**: Medium`;
        }
      }

      res.json({ text: reply });
    }
  });

  // API Route for LexAI Document Generator
  app.post("/api/lexai/document", async (req, res) => {
    const { templateType, formData } = req.body;
    try {
      const prompt = `
      Act as a Nigerian Lawyer. Create a simple, legally sound draft for a "${templateType}".
      
      Here are the details provided:
      ${Object.entries(formData || {}).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
      
      Format nicely with clear headings. 
      Add a disclaimer at the bottom saying: "This is a generated template for educational purposes. Consult a lawyer before signing."
      `;

      const response = await generateContentWithFallback({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      res.json({ text: response.text || "Could not generate document." });
    } catch (error: any) {
      console.warn("Document API error (activating high-quality static document builder):", error);
      
      // High quality fallback document generator based on templateType
      let fallbackText = "";
      const dateStr = new Date().toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const templateLower = (templateType || "").toLowerCase();

      if (templateLower.includes("tenancy") || templateLower.includes("rent")) {
        const landlord = formData['Landlord Name'] || '[LANDLORD NAME]';
        const tenant = formData['Tenant Name'] || '[TENANT NAME]';
        const address = formData['Address'] || '[PROPERTY ADDRESS]';
        const rent = formData['Rent Amount'] || '[RENT AMOUNT]';
        const duration = formData['Duration'] || '[DURATION]';

        fallbackText = `TENANCY AGREEMENT

THIS TENANCY AGREEMENT is made this ${dateStr}
BETWEEN:
${landlord.toUpperCase()} (hereinafter referred to as the "Landlord" which expression shall where the context so admits include his heirs, executors, administrators and assigns) of the one part;

AND

${tenant.toUpperCase()} (hereinafter referred to as the "Tenant" which expression shall where the context so admits include his/her executors, administrators and assigns) of the other part.

WHEREAS:
The Landlord is the beneficial owner of the residential premises situated at ${address.toUpperCase()} (hereinafter referred to as the "Demised Premises").
The Tenant is desirous of taking tenancy of the Demised Premises, and the Landlord has agreed to let same under the terms and conditions hereinafter set out.

IT IS HEREBY AGREED AS FOLLOWS:

1. RENT AND TERM
The Tenancy shall be for a term of ${duration} commencing on ${dateStr} at the annual rent of NGN ${rent} (Nigerian Naira) payable in advance.

2. THE TENANT COVENANTS WITH THE LANDLORD AS FOLLOWS:
a) To pay the rent as and when due in the manner specified above.
b) To keep the interior of the Demised Premises in good, clean, and tenantable repair and condition (fair wear and tear excepted).
c) Not to make any structural alterations or additions to the Demised Premises without the prior written consent of the Landlord.
d) Not to assign, sublet, or part with possession of the Demised Premises or any part thereof without the written consent of the Landlord first had and obtained.
e) To use the premises strictly for private residential purposes and not to commit or permit any nuisance or illegal activities therein.

3. THE LANDLORD COVENANTS WITH THE TENANT AS FOLLOWS:
a) That the Tenant paying the rent and performing the covenants shall peaceably hold and enjoy the Demised Premises during the said term without any unlawful interruption by the Landlord or his agents.
b) To be responsible for the payment of all major rates, land taxes, and structural repairs of the external parts of the building.

4. TERMINATION
Upon expiration of this tenancy, both parties may negotiate renewal terms. If either party intends to terminate this agreement, statutory notices must be served in accordance with the Tenancy Law.

IN WITNESS WHEREOF the parties have hereunto set their hands and seals the day and year first above written.

____________________________
SIGNATURE OF THE LANDLORD


____________________________
SIGNATURE OF THE TENANT

DISCLAIMER: This is a generated template for educational purposes. Consult a lawyer before signing.`;
      } else if (templateLower.includes("loan") || templateLower.includes("borrow")) {
        const lender = formData['Lender Name'] || '[LENDER NAME]';
        const borrower = formData['Borrower Name'] || '[BORROWER NAME]';
        const amount = formData['Amount'] || '[LOAN AMOUNT]';
        const repaymentDate = formData['Repayment Date'] || '[REPAYMENT DATE]';

        fallbackText = `LOAN AGREEMENT

THIS LOAN AGREEMENT is made this ${dateStr}
BETWEEN:
${lender.toUpperCase()} (hereinafter referred to as the "Lender") of the one part;

AND

${borrower.toUpperCase()} (hereinafter referred to as the "Borrower") of the other part.

WHEREAS:
1. The Borrower has requested a friendly personal loan of money from the Lender to meet urgent personal needs.
2. The Lender has agreed to advance the said loan to the Borrower on the terms and conditions hereinafter appearing.

NOW IT IS AGREED AS FOLLOWS:

1. PRINCIPAL SUM
The Lender hereby advances to the Borrower, and the Borrower acknowledges receipt of the sum of NGN ${amount} (Nigerian Naira) (the "Loan").

2. REPAYMENT COVENANT
The Borrower hereby covenants and promises to repay the entire principal Loan sum of NGN ${amount} to the Lender in full on or before the agreed date: ${repaymentDate}.

3. INTEREST AND FEE
This is a friendly loan. No interest, charges, or fees shall accrue on this Loan, provided the Borrower complies with the repayment terms herein.

4. DEFAULT AND RECOVERY
a) If the Borrower fails to repay the Loan on or before the specified repayment date, the entire outstanding sum shall immediately become due and payable.
b) In the event of default, the Lender shall be entitled to recover the sum by legal proceedings under Nigerian law, and the Borrower shall bear all legal costs, court fees, and recovery expenses incurred by the Lender.

5. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the Laws of the Federal Republic of Nigeria.

IN WITNESS WHEREOF the parties hereto have set their hands the day and year first above written.

____________________________
SIGNATURE OF THE LENDER


____________________________
SIGNATURE OF THE BORROWER

DISCLAIMER: This is a generated template for educational purposes. Consult a lawyer before signing.`;
      } else {
        // Employment fallback
        const employer = formData['Employer Name'] || '[EMPLOYER NAME]';
        const employee = formData['Employee Name'] || '[EMPLOYEE NAME]';
        const role = formData['Role'] || '[ROLE / POSITION]';
        const salary = formData['Salary'] || '[SALARY AMOUNT]';
        const startDate = formData['Start Date'] || '[START DATE]';

        fallbackText = `LETTER OF EMPLOYMENT

Date: ${dateStr}

To: ${employee.toUpperCase()}
Subject: OFFER OF EMPLOYMENT AS ${role.toUpperCase()}

Dear ${employee},

On behalf of ${employer.toUpperCase()} (the "Employer"), we are pleased to offer you employment for the position of ${role.toUpperCase()} under the following terms and conditions:

1. COMMENCEMENT DATE
Your employment with the Employer shall commence on ${startDate}.

2. DUTIES AND RESPONSIBILITIES
You shall perform all duties, responsibilities, and tasks standard for the position of ${role} as well as any other reasonable tasks assigned to you by your supervisor or management. You agree to execute your duties with professionalism, diligence, and in the best interest of the Employer.

3. COMPENSATION
Your monthly basic salary shall be NGN ${salary} (Nigerian Naira), payable on or before the last working day of each calendar month. This salary is subject to all applicable statutory tax deductions.

4. WORK HOURS
Your official working hours shall be specified in accordance with operational schedules. You are expected to show punctuality and high commitment.

5. TERMINATION OF EMPLOYMENT
Either party may terminate this employment agreement by giving at least one (1) month written notice or by paying one (1) month's basic salary in lieu of such notice.

Please sign and return the duplicate copy of this letter to signify your acceptance of this offer and its terms.

We look forward to having you on our team.

Yours faithfully,

For: ${employer.toUpperCase()}


____________________________
AUTHORIZED SIGNATORY


ACCEPTANCE OF OFFER:
I, ${employee.toUpperCase()}, hereby accept the offer of employment as specified above, and agree to abide by all the terms and conditions.


____________________________
SIGNATURE OF THE EMPLOYEE      DATE: __________________

DISCLAIMER: This is a generated template for educational purposes. Consult a lawyer before signing.`;
      }

      res.json({ text: fallbackText });
    }
  });

  // API Route for LexAI Daily Legal Tip
  app.get("/api/lexai/daily-tip", async (req, res) => {
    try {
      const prompt = `
      Act as a smart Nigerian Lawyer. Generate one random, highly relevant, and simplified Nigerian constitutional fact or legal right of citizens.
      Return the response STRICTLY as a raw JSON object (with no markdown block tags like \`\`\`json) matching this structure:
      {
        "title": "A short catchy title of the legal right or fact (e.g., 'Right to Remain Silent' or 'Landlord Entry Rules')",
        "explanation": "A simplified, street-smart explanation in standard Nigerian Pidgin mixed with simple English. Keep it warm, engaging, and clear (maximum 2-3 sentences).",
        "citation": "The exact constitutional section or law act name (e.g., 'Section 35 of the 1999 Constitution' or 'Section 7 of the Tenancy Law')"
      }
      `;

      const response = await generateContentWithFallback({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        temperature: 0.9
      });

      const text = response.text || "{}";
      // Clean up markdown block wrappers if present
      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedTip = JSON.parse(cleanText);

      res.json(parsedTip);
    } catch (error: any) {
      console.error("Daily Tip API error:", error);
      // Fallback tips in case of failure
      const fallbacks = [
        {
          title: "Bail is Free",
          explanation: "No let anybody run you street say you must pay money before they release suspect for police station. Under Nigerian law, bail is 100% free!",
          citation: "Section 35 of the 1999 Constitution"
        },
        {
          title: "Right to Remain Silent",
          explanation: "If police arrest you, you get full right to keep quiet. You no must talk or answer any question until your lawyer dey present.",
          citation: "Section 35(2) of the 1999 Constitution"
        },
        {
          title: "Phone Search Protection",
          explanation: "Police officers no get right to just stop you and begin search your phone contents unless dem get specific warrant or official authorization.",
          citation: "Section 37 of the 1999 Constitution (Right to Privacy)"
        }
      ];
      const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      res.json(randomFallback);
    }
  });

  // Set up HTTP server to integrate both Express and WebSockets
  const server = http.createServer(app);

  // Set up WebSocket Server for Live API proxy
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", async (clientWs, request) => {
    console.log("Client connected to Live Proxy WebSocket");
    
    // Parse query parameters
    const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
    const mode = url.searchParams.get("mode") || "cruise";
    const language = url.searchParams.get("language") || "english_pidgin";
    const customSystemInstruction = url.searchParams.get("customSystemInstruction");

    // Config based on mode or Custom Prompt
    let systemInstruction = "";
    if (customSystemInstruction) {
        systemInstruction = `
        IMPORTANT: YOU ARE IN A ROLEPLAY SIMULATION FOR EDUCATIONAL PURPOSES.
        
        YOUR CHARACTER:
        ${customSystemInstruction}
        
        RULES:
        1. COMMIT FULLY to the character. Do not break character to say "I am an AI".
        2. If the character is described as angry, rude, or aggressive, BE THAT WAY. This is a training simulation for conflict resolution.
        3. Speak in Nigerian Pidgin or appropriate local dialect (${language === 'hausa' ? 'Hausa' : language === 'igbo' ? 'Igbo' : language === 'yoruba' ? 'Yoruba' : 'Nigerian Pidgin'}) for the character.
        4. Keep responses spoken-style (short, reactive, conversational).
        5. DO NOT provide legal advice in this mode. You are the 'Wahala' (Problem), not the solution.
        `;
    } else {
        systemInstruction = getSystemInstruction(mode, language);
    }

    const voiceName = mode === 'cruise' || customSystemInstruction ? 'Puck' : 'Zephyr';

    let session: any = null;
    let connected = false;
    const liveModels = ['gemini-3.1-flash-live-preview'];

    // Helper to connect to a specific Live API model sequentially
    const connectToLiveModel = (modelName: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        let activeSession: any = null;
        let isResolved = false;

        console.log(`[LexAI Live] Initiating connection using model: ${modelName}...`);
        ai.live.connect({
          model: modelName,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            },
            systemInstruction: systemInstruction,
          },
          callbacks: {
            onopen: () => {
              console.log(`[LexAI Live] Connection opened via ${modelName}`);
              isResolved = true;
              clientWs.send(JSON.stringify({ type: "open" }));
              resolve(activeSession);
            },
            onmessage: (message: any) => {
              clientWs.send(JSON.stringify({ type: "message", message }));
            },
            onclose: () => {
              console.log(`[LexAI Live] Connection closed for ${modelName}`);
              clientWs.send(JSON.stringify({ type: "close" }));
              try { clientWs.close(); } catch (e) {}
            },
            onerror: (err: any) => {
              console.error(`[LexAI Live] Error callback with ${modelName}:`, err);
              if (!isResolved) {
                isResolved = true;
                reject(err);
              } else {
                clientWs.send(JSON.stringify({ type: "error", error: err.message || "Gemini error" }));
                try { clientWs.close(); } catch (e) {}
              }
            }
          }
        }).then((s) => {
          activeSession = s;
        }).catch((err) => {
          if (!isResolved) {
            isResolved = true;
            reject(err);
          }
        });

        // Timeout connection attempt after 6 seconds to prevent hanging
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            reject(new Error("Connection timeout after 6 seconds"));
          }
        }, 6000);
      });
    };

    // Sequential fallback loop
    for (const liveModel of liveModels) {
      if (connected) break;
      try {
        session = await connectToLiveModel(liveModel);
        connected = true;
        console.log(`[LexAI Live] Successfully connected with model: ${liveModel}`);
        
        // Only register client message listener once connected
        clientWs.on("message", async (data: any) => {
          try {
            const parsed = JSON.parse(data.toString());
            if (parsed.type === "realtimeInput" && session) {
              await session.sendRealtimeInput(parsed.input);
            }
          } catch (err) {
            console.error("[LexAI Live] Error processing client message:", err);
          }
        });

        clientWs.on("close", () => {
          console.log("[LexAI Live] Client closed connection");
          if (session) {
            try {
              session.close();
            } catch (e) {}
          }
        });

        break;
      } catch (err: any) {
        console.warn(`[LexAI Live] Failed with model ${liveModel}:`, err.message || err);
      }
    }

    if (!connected) {
      console.error("[LexAI Live] All Live API fallback models failed to connect.");
      clientWs.send(JSON.stringify({ type: "error", error: "Failed to connect to AI voice service. Try again soon." }));
      try { clientWs.close(); } catch (e) {}
    }
  });

  // Handle upgrade to WebSockets
  server.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
    if (pathname === "/api/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Serve static assets and SPA fallback in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
