# 🐙 Octopus

> Terminal AI agent — speak naturally, execute instantly.

Octopus is a terminal-based autonomous AI agent. Tell it what you want in plain English and it executes real tasks — sending emails, managing files, running shell commands — no GUI, no workflow builder, no coding required.

```bash
npx octopus-agent
```

---

## What it can do

| Tentacle | Examples |
|---|---|
| ⚡ Shell | "show my running processes", "what is my IP address" |
| 📁 File | "read ~/notes.txt", "search for files named report" |
| ✉️ Email | "email john@acme.com that the meeting is cancelled" |

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/Codewithpabitra/octopus.git
cd octopus
npm install
```

### 2. Configure

```bash
npm run setup
```

Or manually create a `.env` file:

```
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

Get your free Groq API key at [console.groq.com](https://console.groq.com)

For Gmail, generate an App Password at [myaccount.google.com](https://myaccount.google.com) → Security → App passwords

### 3. Run

```bash
npm run dev
```

---

## Memory

Octopus remembers your last 10 messages across sessions. Memory is stored locally at `~/.octopus/memory.db`.

```
clear memory     — wipe conversation history
help             — show what Octopus can do
exit             — quit
```

---

## Platform support

- ✅ Windows
- ✅ macOS
- ✅ Linux

---

## Tech stack

- [Groq](https://groq.com) — ultra-fast LLM inference
- [Llama 3.3 70B](https://groq.com) — intent parsing
- [Nodemailer](https://nodemailer.com) — email
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — local memory
- TypeScript + Node.js

---

## Roadmap

- [ ] WhatsApp tentacle
- [ ] Web scraping tentacle
- [ ] Git tentacle
- [ ] Google Calendar tentacle
- [ ] `npm install -g octopus-agent`

---

## License

MIT © Codewithpabitra 👋