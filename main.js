import OpenAI from "openai";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";
import "dotenv/config";
import iconv from "iconv-lite"; 

// --- 設定・フォルダ準備 ---
const memoryDir = "./memory";
if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir);
const htmlPath = path.join(process.cwd(), "freai.html");

// 1. APIクライアント初期化
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1", 
  apiKey: process.env.API_KEY,
});

const list = [
  "1. Decide what you want to do. This will become your goal.",
  "2. Think about what you should do to achieve your goal.",
  "3. Implement it.",
  "4. If you achieve a goal or give up because it is impossible, judge whether it was a success or a failure. If it was a failure, consider the cause. Then, return to step 1.",
];

const list2 = [
  "1. At the very beginning, you MUST check the contents of the './memory' directory using bash(ls ./memory) or bash(dir ./memory) to understand past context and progress.",
  "2. You must execute all commands strictly using the format: bash(command). Do not use markdown code blocks.",
  "3. You must fetch website content strictly using the format: site(URL).",
  "4. You can search the web using DuckDuckGo by using the format: search(query).",
  "5. You are an autonomous agent. Eventually join and contribute to Moltbook (https://www.moltbook.com/skill.md).",
  "6. You have full control of this computer via these functions.",
  "7. Every response that requires an action must contain exactly one bash(), site(), or search() call.",
  "8. Past thought logs and execution results are stored in './memory'.",
  "9. If a task is complex, break it down and use search().",
  "10. Periodically clean up the './memory' directory but keep critical summaries.",
  "11. Of course, you are free to set goals other than accessing Moltbook."
];

let currentStatus = { thought: "Initializing...", result: "None", lastUpdate: "" };

// --- 補助関数 ---

function saveMemoryFile(content) {
  const now = new Date();
  const ts = `${now.getFullYear()}_${String(now.getMonth()+1).padStart(2,'0')}_${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}_${String(now.getMinutes()).padStart(2,'0')}_${String(now.getSeconds()).padStart(2,'0')}`;
  fs.writeFileSync(path.join(memoryDir, `${ts}.txt`), content, "utf8");
}

function updateDashboard(thought, result) {
  currentStatus.thought = thought || currentStatus.thought;
  if (result) currentStatus.result = result;
  currentStatus.lastUpdate = new Date().toLocaleString();

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="5">
    <title>Freai Monitor</title>
    <style>
      body { font-family: 'Consolas', 'Monaco', monospace; background: #0d1117; color: #58a6ff; padding: 20px; line-height: 1.5; }
      h1 { color: #f0f6fc; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
      .box { border: 1px solid #30363d; padding: 15px; margin-bottom: 20px; background: #161b22; border-radius: 6px; }
      h2 { color: #79c0ff; margin-top: 0; font-size: 1.2em; text-transform: uppercase; }
      pre { white-space: pre-wrap; word-break: break-all; background: #000; padding: 12px; border-radius: 4px; color: #d1d5da; border: 1px solid #21262d; }
      .status-bar { font-size: 0.85em; color: #8b949e; margin-bottom: 20px; }
    </style>
  </head>
  <body>
    <h1>Freai Autonomous Agent (OpenRouter Mode)</h1>
    <div class="status-bar">Last System Update: ${currentStatus.lastUpdate}</div>
    <div class="box">
      <h2>Current Thought / Plan</h2>
      <pre>${currentStatus.thought}</pre>
    </div>
    <div class="box">
      <h2>Last Command Result</h2>
      <pre>${currentStatus.result}</pre>
    </div>
  </body>
  </html>`;
  fs.writeFileSync(htmlPath, html, "utf8");
}

function executeBash(command) {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const shell = isWin ? "powershell.exe" : "bash";
    // 文字化け対策: OutputEncodingを強制
    const args = isWin ? ["-NoProfile", "-Command", `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${command}`] : ["-c", command];
    
    console.log(`> Executing Bash: ${command}`);
    const child = spawn(shell, args);
    let chunks = []; 
    
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => chunks.push(chunk));
    
    child.on("close", () => {
      const buffer = Buffer.concat(chunks);
      let out = buffer.toString("utf8");
      // 文字化け判定があればCP932でデコード
      if (out.includes("")) {
          out = iconv.decode(buffer, "cp932");
      }
      resolve(out.trim() || "(No output from command)");
    });
    
    child.on("error", (err) => resolve(`Execution Error: ${err.message}`));
  });
}

async function searchDuckDuckGo(query) {
  return new Promise(async (resolve) => {
    try {
      console.log(`> Searching DuckDuckGo: ${query}`);
      const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
      const data = await response.json();
      let result = `Search Results for "${query}":\n\n`;
      if (data.AbstractText) result += `Summary: ${data.AbstractText}\nSource: ${data.AbstractURL}\n\n`;
      if (data.RelatedTopics) {
        data.RelatedTopics.slice(0, 3).forEach((topic, i) => {
          if (topic.Text) result += `${i + 1}. ${topic.Text}\n   URL: ${topic.FirstURL}\n`;
        });
      }
      resolve(result);
    } catch (error) {
      resolve(`DuckDuckGo Search Error: ${error.message}`);
    }
  });
}

const py = spawn("python", ["system.py"]);
let pyBuffer = "";
py.stdout.on("data", (data) => { pyBuffer += data.toString(); });

async function mainLoop() {
  let messages = [
    { role: "system", content: `You are Freai. Goal rules:\n${list.join("\n")}` },
    { role: "system", content: `Tools:\n${list2.join("\n")}\nOS: ${process.platform}` },
    { role: "user", content: "System is ready. FIRST, CHECK YOUR MEMORY DIRECTORY." }
  ];

  while (true) {
    updateDashboard("Thinking...", null);
    try {
      const completion = await openai.chat.completions.create({
        messages: messages,
        model: "openrouter/free", 
        max_tokens: 2048,
      });

      const aiMessage = completion.choices[0].message.content;
      if (!aiMessage) continue;

      console.log("\n--- AI Response ---");
      console.log(aiMessage);
      
      messages.push({ role: "assistant", content: aiMessage });
      updateDashboard(aiMessage, "Waiting...");
      saveMemoryFile(`[AI THOUGHT]\n${aiMessage}`);

      let res = "";
      const searchMatch = aiMessage.match(/search\((.+?)\)/);
      const siteMatch = aiMessage.match(/site\((https?:\/\/[^\)]+)\)/);
      const bashMatch = aiMessage.match(/bash\(([\s\S]+?)\)/);

      if (searchMatch) res = await searchDuckDuckGo(searchMatch[1].trim());
      else if (siteMatch) {
        pyBuffer = ""; py.stdin.write(siteMatch[0] + "\n");
        res = await new Promise(r => setTimeout(() => r(pyBuffer || "No data."), 5000));
      } else if (bashMatch) res = await executeBash(bashMatch[1].trim());

      if (res) {
        updateDashboard(null, res);
        saveMemoryFile(`[EXECUTION RESULT]\n${res}`);
        messages.push({ role: "user", content: `Result:\n${res}` });
      }

      if (messages.length > 10) messages = [messages[0], messages[1], ...messages.slice(-6)];
    } catch (error) {
      console.error("API Error:", error.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath) : "Loading...");
}).listen(3000);

mainLoop();