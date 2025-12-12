// ---------------------------
// Snippet Constructor
// ---------------------------
const snippetData = {
    lighting: ["Cinematic Lighting", "Neon Lights", "Moody Shadows", "Golden Hour"],
    style: ["Ultra-detailed", "Photorealistic", "Anime Style", "Watercolor Painting"],
    subject: ["Cityscape", "Forest", "Space Station", "Fantasy Castle"]
};

let snippetChips = [];  // only buttons
let manualPrompt = "";  // user typed manually

// Track textarea edits
document.getElementById("prompt").addEventListener("input", (e) => {
    manualPrompt = e.target.value;
});

// Render snippet buttons
function renderSnippetButtons() {
    Object.entries(snippetData).forEach(([category, snippets]) => {
        const container = document.getElementById(`${category}Snippets`);
        snippets.forEach(text => {
            const btn = document.createElement("button");
            btn.classList.add("snippet-btn");
            btn.innerText = text;
            btn.addEventListener("click", () => {
                if (!snippetChips.includes(text)) {
                    snippetChips.push(text);
                    updatePromptUI();
                }
            });
            container.appendChild(btn);
        });
    });
}

// Update chips + textarea
function updatePromptUI() {
    const chipsContainer = document.getElementById("promptChips");
    chipsContainer.innerHTML = "";

    snippetChips.forEach((snippet, index) => {
        const chip = document.createElement("div");
        chip.innerText = snippet + " ✕";
        chip.style.border = "1px solid #ccc";
        chip.style.borderRadius = "12px";
        chip.style.padding = "5px 10px";
        chip.style.cursor = "pointer";
        chip.style.background = "#eee";

        chip.addEventListener("click", () => {
            snippetChips.splice(index, 1);
            updatePromptUI();
        });

        chipsContainer.appendChild(chip);
    });

    // Merge snippets + manual edits
    let finalPrompt = snippetChips.join(", ");
    if (manualPrompt.trim() !== "") {
        if (finalPrompt) finalPrompt += ", ";
        finalPrompt += manualPrompt;
    }

    document.getElementById("prompt").value = finalPrompt;
}

// Render buttons on page load
document.addEventListener("DOMContentLoaded", () => {
    renderSnippetButtons();
});

// ---------------------------
// Phase 1: Generate Image
// ---------------------------
const HORDE_URL = "https://aihorde.net/api/v2/generate/async";

async function generateImage() {
    const prompt = document.getElementById("prompt").value.trim();
    const apiKey = document.getElementById("apiKey").value.trim();

    if (!prompt) return alert("Enter a prompt!");
    if (!apiKey) return alert("Enter your AI Horde API key!");

    document.getElementById("status").innerText = "Sending request...";
    document.getElementById("resultImage").style.display = "none";

    const payload = {
        prompt: prompt,
        model: document.getElementById("modelSelect").value,
        params: {
            width: parseInt(document.getElementById("widthInput").value),
            height: parseInt(document.getElementById("heightInput").value),
            steps: parseInt(document.getElementById("stepsInput").value),
            sampler_name: document.getElementById("samplerSelect").value,
            cfg_scale: parseFloat(document.getElementById("cfgInput").value),
            seed: document.getElementById("seedInput").value || undefined,
            hires_fix: document.getElementById("hiresFixInput").checked
        }
    };

    let res;
    try {
        res = await fetch(HORDE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": apiKey
            },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error("Network error:", err);
        document.getElementById("status").innerText = "Network error";
        return;
    }

    const json = await res.json();
    console.log("AI Horde response:", json);

    if (!res.ok || !json.id) {
        document.getElementById("status").innerText = "Generation request failed: " + (json.error || "Unknown error");
        return;
    }

    const id = json.id;
    document.getElementById("status").innerText = "Waiting for AI to finish...";
    const imageUrl = await pollForImage(id);

    if (imageUrl) {
        document.getElementById("resultImage").src = imageUrl;
        document.getElementById("resultImage").style.display = "block";
        document.getElementById("status").innerText = "Done!";
    } else {
        document.getElementById("status").innerText = "Failed to get image.";
    }
}

// ---- Polling Function (handles 429 rate limit) ----
async function pollForImage(id) {
    const statusUrl = `https://aihorde.net/api/v2/generate/status/${id}`;

    while (true) {
        let res;
        try {
            res = await fetch(statusUrl);
        } catch (err) {
            console.error("Polling network error:", err);
            await new Promise(r => setTimeout(r, 7000));
            continue;
        }

        if (res.status === 429) {
            console.warn("Rate limited, waiting 10s...");
            document.getElementById("status").innerText = "Rate limited, waiting...";
            await new Promise(r => setTimeout(r, 10000));
            continue;
        }

        const json = await res.json();
        console.log("Polling:", json);

        if (json.finished) {
            if (json.generations.length > 0) return json.generations[0].img;
            await new Promise(r => setTimeout(r, 7000));
        } else {
            document.getElementById("status").innerText = "Processing... please wait";
            await new Promise(r => setTimeout(r, 7000));
        }
    }
}

// ---- Hook generate button ----
document.getElementById("generateBtn").onclick = generateImage;
