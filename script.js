// ==========================================
// ⚠️ ENTER YOUR GEMINI API KEY BELOW
// ==========================================
const GEMINI_API_KEY = "AIzaSyCcY8X8UihMI9pzaiLYDXrwo1pUTjZDWOA"; 
// ==========================================

// --- HELPERS ---
function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

function formatCurrency(num) {
    return parseFloat(num).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseNumber(value) {
    const n = parseFloat(value);
    return isNaN(n) ? 0 : n;
}

function checkContentFit(showAlert = false) {
    const preview = document.getElementById("quote-preview");
    const warningBox = document.getElementById("overflowWarning");
    if (!preview) return true;

    const leeway = 12; 
    const heightDelta = preview.scrollHeight - preview.clientHeight;
    const needsWarn = preview.clientHeight > 0 && heightDelta > leeway;

    return !needsWarn;
}

// --- TEXT FIELD MAPPING ---
const fieldMap = [
    { inputId: "quoteNumber", fieldName: "quoteNumber" },
    { inputId: "quoteDate", fieldName: "quoteDate" },
    { inputId: "clientName", fieldName: "clientName" },
    { inputId: "clientAddress", fieldName: "clientAddress" },
    { inputId: "projectTitle", fieldName: "projectTitle" },
    { inputId: "scope", fieldName: "scope" },
    { inputId: "terms", fieldName: "terms" },
    { inputId: "signerName", fieldName: "signerName" },
    { inputId: "signerTitle", fieldName: "signerTitle" }
];

function buildBulletLines(rawValue, lineClass) {
    const lines = rawValue.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
    return lines.map(line => 
        `<div class="${lineClass}">
            <img src="bulletpoint.png" class="bullet-icon" alt="•" /> 
            <span>${escapeHtml(line)}</span>
        </div>`
    ).join("");
}

function updateTextPreview() {
    fieldMap.forEach(({ inputId, fieldName }) => {
        const inputEl = document.getElementById(inputId);
        if (!inputEl) return;

        const rawValue = inputEl.value || "";
        const previewEls = document.querySelectorAll(`[data-field="${fieldName}"]`);

        previewEls.forEach((el) => {
            if (fieldName === "quoteNumber") {
                const stripped = rawValue.replace(/^fp[-\s]*/i, "").trim();
                el.textContent = stripped ? `FP-${stripped}` : "FP-XXXX";
            } else if (fieldName === "scope") {
                el.innerHTML = buildBulletLines(rawValue, "scope-line");
            } else if (fieldName === "terms") {
                el.innerHTML = buildBulletLines(rawValue, "term-line");
            } else if (fieldName === "clientAddress") {
                el.innerHTML = escapeHtml(rawValue).replace(/\n/g, "<br>");
            } else {
                el.textContent = rawValue;
            }
        });
    });

    checkContentFit();
}

// --- FINANCIAL LOGIC ---
const provinceTaxRates = {
    AB: 0.05, BC: 0.12, MB: 0.12, NB: 0.15, NL: 0.15, NS: 0.15, 
    NT: 0.05, NU: 0.05, ON: 0.13, PE: 0.15, QC: 0.14975, SK: 0.11, YT: 0.05
};

const marginInput = document.getElementById("profitMargin");
const costInputs = {
    incurred: document.getElementById("costIncurred"),
    labour: document.getElementById("costLabour"),
    materials: document.getElementById("costMaterials"),
    travel: document.getElementById("costTravel")
};
const manualSubtotalInput = document.getElementById("manualSubtotal");
const provinceSelect = document.getElementById("province");

function calculateFinancials() {
    if (!document.querySelector('input[name="financialMode"]:checked')) return;

    const mode = document.querySelector('input[name="financialMode"]:checked').value;
    const pdfStyle = document.querySelector('input[name="pdfStyle"]:checked').value;
    
    let clientSubtotal = 0;
    let lineItems = [];

    if (mode === 'manual') {
        clientSubtotal = parseNumber(manualSubtotalInput.value);
    } else {
        const marginPct = parseNumber(marginInput.value);
        let divisor = 1 - (marginPct / 100);
        if (divisor <= 0) divisor = 1; 

        const sellIncurred = parseNumber(costInputs.incurred.value) / divisor;
        const sellLabour = parseNumber(costInputs.labour.value) / divisor;
        const sellMaterials = parseNumber(costInputs.materials.value) / divisor;
        const sellTravel = parseNumber(costInputs.travel.value) / divisor;

        clientSubtotal = sellIncurred + sellLabour + sellMaterials + sellTravel;

        if (sellIncurred > 0.01) lineItems.push({ label: "Incurred", value: sellIncurred });
        if (sellLabour > 0.01) lineItems.push({ label: "Labour", value: sellLabour });
        if (sellMaterials > 0.01) lineItems.push({ label: "Materials", value: sellMaterials });
        if (sellTravel > 0.01) lineItems.push({ label: "Travel", value: sellTravel });
    }

    const rate = provinceTaxRates[provinceSelect.value] || 0;
    const taxAmount = clientSubtotal * rate;
    const totalAmount = clientSubtotal + taxAmount;

    // Update Inputs
    document.getElementById("displaySubtotal").value = formatCurrency(clientSubtotal);
    document.getElementById("displayTax").value = formatCurrency(taxAmount);
    document.getElementById("displayTotal").value = formatCurrency(totalAmount);

    // Update Preview Table
    const tbody = document.getElementById("financial-tbody");
    if (tbody) {
        tbody.innerHTML = ""; 
        if (pdfStyle === 'detailed' && lineItems.length > 0) {
            lineItems.forEach(item => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td class="label">${item.label}</td>
                    <td class="value">$${formatCurrency(item.value)}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // Update Footer Totals
    const subtotalEl = document.querySelector('[data-field="subtotal"]');
    const taxEl = document.querySelector('[data-field="tax"]');
    const totalEl = document.querySelector('[data-field="total"]');

    if (subtotalEl) subtotalEl.textContent = formatCurrency(clientSubtotal);
    if (taxEl) taxEl.textContent = formatCurrency(taxAmount);
    if (totalEl) totalEl.textContent = formatCurrency(totalAmount);

    checkContentFit();
}

// --- SIGNATURE UPLOAD ---
const signatureUpload = document.getElementById("signatureUpload");
const signatureImg = document.getElementById("signatureImage");

function resetSignatureImage() {
    if (signatureImg) {
        signatureImg.src = "";
        checkContentFit();
    }
}

function handleSignatureFile(file) {
    if (!file || !signatureImg) {
        resetSignatureImage();
        return;
    }

    if (!file.type.startsWith("image/")) {
        alert("Please upload an image file (PNG or JPG) for the signature.");
        resetSignatureImage();
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        signatureImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

if (signatureImg) {
    signatureImg.addEventListener("load", () => checkContentFit());
}

if (signatureUpload) {
    signatureUpload.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        handleSignatureFile(file);
    });
}

// --- AI REVIEW LOGIC (Hardcoded Key) ---
const reviewBtn = document.getElementById("reviewScopeBtn");
const feedbackBox = document.getElementById("aiFeedback");
const feedbackContent = document.getElementById("aiResponseContent");

if(reviewBtn) {
    reviewBtn.addEventListener("click", async () => {
        // Use the hardcoded key
        const key = GEMINI_API_KEY;
        const request = document.getElementById("customerRequest")?.value || "";
        const scope = document.getElementById("scope")?.value || "";

        if (!key || key.includes("PASTE_YOUR_KEY")) { 
            alert("Error: The API Key is missing in script.js. Please edit the file and paste your key."); 
            return; 
        }
        if (!request || !scope) { 
            alert("Please fill in 'Customer Request' and 'Scope'."); 
            return; 
        }

        reviewBtn.disabled = true;
        reviewBtn.textContent = "✨ Analyzing...";
        feedbackBox.style.display = "none";

        const prompt = `
            Act as a senior Project Manager. Review this Scope of Work against the Customer Request.
            CUSTOMER REQUEST: "${request}"
            PROPOSED SCOPE: "${scope}"
            Check if the scope covers the request and is professional. Be concise.
        `;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

        const maxRetries = 3;
        let attempt = 0;
        let success = false;

        while (attempt < maxRetries && !success) {
            try {
                attempt++;
                if(attempt > 1) reviewBtn.textContent = `✨ Busy, retrying (${attempt}/${maxRetries})...`;

                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.2 }
                    })
                });

                if (response.status === 503) throw new Error("Overloaded");
                
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);

                if (data.candidates && data.candidates.length > 0) {
                    const aiText = data.candidates[0].content.parts[0].text; 
                    feedbackContent.textContent = aiText;
                    feedbackBox.style.display = "block";
                    success = true;
                } else {
                    throw new Error("No response generated.");
                }

            } catch (error) {
                console.warn(`Attempt ${attempt} failed: ${error.message}`);
                if (attempt === maxRetries) {
                    alert("AI Error: " + error.message);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        reviewBtn.disabled = false;
        reviewBtn.textContent = "✨ AI Review Scope";
    });
}

// --- LISTENERS ---
fieldMap.forEach(({ inputId }) => {
    const el = document.getElementById(inputId);
    if(el) el.addEventListener("input", updateTextPreview);
});

const financialTriggerInputs = [
    marginInput, manualSubtotalInput, provinceSelect, ...Object.values(costInputs)
];
financialTriggerInputs.forEach(el => {
    if(el) {
        el.addEventListener("input", calculateFinancials);
        el.addEventListener("change", calculateFinancials);
    }
});

document.querySelectorAll('input[name="financialMode"]').forEach(el => {
    el.addEventListener("change", (e) => {
        const mode = e.target.value;
        document.getElementById("margin-inputs").style.display = mode === "margin" ? "block" : "none";
        document.getElementById("manual-inputs").style.display = mode === "manual" ? "block" : "none";
        calculateFinancials();
    });
});

document.querySelectorAll('input[name="pdfStyle"]').forEach(el => {
    el.addEventListener("change", calculateFinancials);
});

// REPLACE THE EXISTING BUTTON LISTENER WITH THIS:

document.getElementById("generatePdfBtn").addEventListener("click", async () => {
  calculateFinancials();
  checkContentFit(true);

  // 1. Clone the preview
  const preview = document.getElementById("quote-preview").cloneNode(true);
  
  // 2. Prepare the HTML structure for Puppeteer
  // Note: We add a <base> tag so Puppeteer finds images relative to the server URL
  // We also link the external stylesheet instead of trying to read inline styles
  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <base href="http://localhost:3000/">
        <link rel="stylesheet" href="style.css" /> 
        <style>
            @media print { 
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
                #quote-preview { margin: 0; border: none; box-shadow: none; }
            }
        </style>
      </head>
      <body>
        ${preview.outerHTML}
      </body>
    </html>`;

  const quoteNum = (document.getElementById("quoteNumber").value || "DRAFT").replace(/[^a-z0-9-]/gi, '');
  const client = (document.getElementById("clientName").value || "Client").replace(/[^a-z0-9]/gi, '_');
  const filename = `FP-${quoteNum}-${client}.pdf`;

  try {
    const res = await fetch('/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: fullHtml, filename })
    });

    if (!res.ok) throw new Error("Server returned " + res.status);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    alert("PDF generation failed. \n1. Is 'node server.js' running?\n2. Check the console for details.");
  }
});

// Init
updateTextPreview();
calculateFinancials();
