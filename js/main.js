// --- CONFIG ---
const HORDE_URL = "https://aihorde.net/api/v2/generate/async";

// ---- GENERATION FUNCTION ----
async function generateImage() {
    const prompt = document.getElementById("prompt").value.trim();
    const apiKey = document.getElementById("apiKey").value.trim();

    if (!prompt) return alert("Enter a prompt!");
    if (!apiKey) return alert("Enter your AI Horde API key!");

    document.getElementById("status").innerText = "Sending request...";
    document.getElementById("resultImage").style.display = "none";

    const payload = {
        prompt: prompt,
        params: {
            width: 512,
            height: 512,
            steps: 20,
            sampler_name: "k_euler",
            cfg_scale: 7
        }
    };

    console.log("Sending payload:", payload);

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

// ---- POLLING FUNCTION ----
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
            console.warn("Rate limited, waiting 10 seconds...");
            document.getElementById("status").innerText = "Rate limited, waiting...";
            await new Promise(r => setTimeout(r, 10000));
            continue;
        }

        const json = await res.json();
        console.log("Polling:", json);

        if (json.finished) {
            if (json.generations.length > 0) {
                return json.generations[0].img;
            } else {
                console.warn("Finished but no generations, retrying...");
                await new Promise(r => setTimeout(r, 7000));
            }
        } else {
            document.getElementById("status").innerText = "Processing... please wait";
            await new Promise(r => setTimeout(r, 7000));
        }
    }
}

// ---- button hookup ----
document.getElementById("generateBtn").onclick = generateImage;
