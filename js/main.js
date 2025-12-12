// --- CONFIG ---
const HORDE_URL = "https://aihorde.net/api/v2/generate/async";

// ---- GENERATION FUNCTION ----
async function generateImage() {
    const prompt = document.getElementById("prompt").value.trim();
    if (!prompt) return alert("Enter a prompt!");

    const payload = {
        prompt: prompt,
        params: {
            width: 512,
            height: 512,
            steps: 20,
            sampler_name: "k_euler",
            cfg_scale: 7,
        }
    };

    console.log("Sending payload:", payload);

    const res = await fetch(HORDE_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": "0000000000" // <-- TEMP. user input later
        },
        body: JSON.stringify(payload)
    });

    const json = await res.json();
    console.log("AI Horde response:", json);

    if (!res.ok) {
        alert("Generation failed: " + json.error);
        return;
    }

    // json contains request ID
    const id = json.id;

    // ---- Poll until ready ---
    const imageUrl = await pollForImage(id);

    // display image
    const img = document.getElementById("resultImage");
    img.src = imageUrl;
    img.style.display = "block";
}

// ---- POLLING FUNCTION ----
async function pollForImage(id) {
    const statusUrl = `https://aihorde.net/api/v2/generate/status/${id}`;

    while (true) {
        const res = await fetch(statusUrl);
        const json = await res.json();
        console.log("Polling:", json);

        if (json.finished) {
            return json.generations[0].img;
        }

        await new Promise(r => setTimeout(r, 2000));
    }
}

// ---- button hookup ----
document.getElementById("generateBtn").onclick = generateImage;

