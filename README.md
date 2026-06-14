<div align="center">

<img src="assets/Octopus_logo.gif" width="120" alt="Octopus logo" />

# Octopus v1.0.0

**Terminal AI Agent — speak naturally, execute instantly.**

*No GUI. No workflow builder. Just your terminal and plain English.*

---

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Groq](https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Gmail](https://img.shields.io/badge/Gmail-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](https://mail.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![npm](https://img.shields.io/badge/npm-coming_soon-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://npmjs.com)

</div>

---

## What is Octopus?

Octopus is a terminal-based autonomous AI agent powered by **Groq + Llama 3.3 70B**. Tell it what you want in plain English and it executes real tasks — no setup wizards, no drag-and-drop, no configuration files.

```bash
🐙 ❯ email john@acme.com that the meeting is moved to Friday
🐙 ❯ list all files in my downloads folder
🐙 ❯ write a file at ~/notes.txt with my project ideas
🐙 ❯ search for files named report in my documents
```

---

## Tentacles (what it can do)

| Tentacle | Trigger phrases | Examples |
|---|---|---|
| ⚡ **Shell** | run, show, check, get, list | "show my running processes", "what is my IP" |
| 📁 **File** | read, write, create, search, list | "read ~/notes.txt", "search for invoice files" |
| ✉️ **Email** | email, send, message | "email priya@gmail.com about the deadline" |

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/Codewithpabitra/octopus.git
cd octopus
npm install
```

### 2. Configure

Run the setup wizard:

```bash
npm run setup
```

Or create `.env` manually:

```env
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

> Get your free Groq API key at [console.groq.com](https://console.groq.com)
>
> Gmail App Password: [myaccount.google.com](https://myaccount.google.com) → Security → App passwords

### 3. Run

```bash
npm run dev
```

---

## Commands

| Command | What it does |
|---|---|
| `help` | Show all tentacles and examples |
| `clear memory` | Wipe conversation history |
| `exit` | Quit Octopus |

---

## Memory

Octopus remembers your last 10 messages **across sessions**. Context is stored locally at `~/.octopus/memory.db` — nothing leaves your machine except the Groq API call.

---

## Platform support

| Platform | Status |
|---|---|
| Windows | ✅ Supported |
| macOS | ✅ Supported |
| Linux | ✅ Supported |

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Language | TypeScript |
| AI / LLM | Groq — Llama 3.3 70B |
| Email | Nodemailer + Gmail OAuth |
| Memory | SQLite via better-sqlite3 |
| CLI | Chalk + Ora |

---

## Roadmap

- [x] Shell tentacle
- [x] File tentacle
- [x] Email tentacle
- [x] Cross-platform (Windows + Mac + Linux)
- [x] Persistent SQLite memory
- [ ] `npx octopus-agent` (npm publish)
- [ ] WhatsApp tentacle
- [ ] Web scraping tentacle (Playwright)
- [ ] Git tentacle
- [ ] Google Calendar tentacle
- [ ] Plugin API for community tentacles

---

## Contributing

PRs are welcome. To add a new tentacle:

1. Create `src/tentacles/yourname.ts`
2. Export an `executeYourname(params)` function
3. Add the action type to `src/core/intentParser.ts`
4. Wire it in `src/core/router.ts`

---

<div align="center">

Built with Octopus by [Codewithpabitra](https://github.com/Codewithpabitra) &nbsp;|&nbsp; MIT License

</div>