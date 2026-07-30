import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const users = {};       // { userId: publicKey }
const messages = {};    // { userId: [ { from, ciphertext, timestamp } ] }

const MESSAGE_TTL_MS = 5 * 60 * 1000; // 5 minuti

function cleanupOldMessages() {
    const now = Date.now();
    for (const userId in messages) {
        messages[userId] = messages[userId].filter(
            msg => now - msg.timestamp < MESSAGE_TTL_MS
        );
        if (messages[userId].length === 0) {
            delete messages[userId];
        }
    }
}

setInterval(cleanupOldMessages, 60 * 1000); // ogni minuto

app.post("/registerKey", (req, res) => {
    const { userId, publicKey } = req.body;
    if (!userId || !publicKey)
        return res.status(400).json({ error: "Missing fields" });

    users[userId] = publicKey;
    res.json({ status: "ok" });
});

app.get("/getKey/:userId", (req, res) => {
    const key = users[req.params.userId];
    if (!key) return res.status(404).json({ error: "User not found" });
    res.json({ publicKey: key });
});

app.post("/sendMessage", (req, res) => {
    const { to, from, ciphertext } = req.body;
    if (!to || !from || !ciphertext)
        return res.status(400).json({ error: "Missing fields" });

    if (!messages[to]) messages[to] = [];
    messages[to].push({
        from,
        ciphertext,
        timestamp: Date.now()
    });

    res.json({ status: "delivered" });
});

app.get("/getMessages/:userId", (req, res) => {
    const userId = req.params.userId;
    const userMessages = messages[userId] || [];
    // svuota inbox dopo il fetch
    delete messages[userId];
    res.json(userMessages);
});

app.listen(3000, () => console.log("Secure relay running on port 3000"));
