import{_ as e,o as a,c as i,a0 as n}from"./chunks/framework.CShDTZbC.js";const E=JSON.parse('{"title":"DevFix Architecture","description":"","frontmatter":{},"headers":[],"relativePath":"architecture.md","filePath":"architecture.md"}'),t={name:"architecture.md"};function r(l,s,p,o,h,c){return a(),i("div",null,[...s[0]||(s[0]=[n(`<h1 id="devfix-architecture" tabindex="-1">DevFix Architecture <a class="header-anchor" href="#devfix-architecture" aria-label="Permalink to &quot;DevFix Architecture&quot;">​</a></h1><p>The architecture of DevFix strictly separates the intelligence of the Agent from the validation logic. This creates a secure, deterministic boundary where the LLM cannot self-certify its success.</p><h2 id="core-flow" tabindex="-1">Core Flow <a class="header-anchor" href="#core-flow" aria-label="Permalink to &quot;Core Flow&quot;">​</a></h2><div class="language-mermaid vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">mermaid</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">graph TD</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    User([Developer]) --&gt;|devfix demo DEV-04| CLI</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    subgraph Core</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        CLI[DevFix CLI] --&gt; Controller[Agent Controller]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    end</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    subgraph Intelligence</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        Controller &lt;--&gt;|Prompts &amp; Tool Calls| LLM[LLM Provider&lt;br/&gt;deepseek-chat]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    end</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    subgraph Execution Boundary</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        Controller --&gt;|Structured Execution| Registry[Tool Registry]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        Registry --&gt;|read_file| Sandbox</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        Registry --&gt;|execute_command| Sandbox</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        Registry --&gt;|patch_file| Sandbox</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    end</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    subgraph Security Boundary</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        Sandbox[Secure Docker Sandbox&lt;br/&gt;Resource Limited / Ephemeral]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    end</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    subgraph Determinism Boundary</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        Sandbox --&gt; Verifier[Deterministic Verifier&lt;br/&gt;Process &amp; HTTP]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        Verifier --&gt;|Success / Fail| Controller</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    end</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    Controller --&gt;|Save Logs| Telemetry[(Telemetry Logger&lt;br/&gt;Credential Scrubbing)]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    Controller --&gt;|Output| User</span></span></code></pre></div><h2 id="boundaries" tabindex="-1">Boundaries <a class="header-anchor" href="#boundaries" aria-label="Permalink to &quot;Boundaries&quot;">​</a></h2><ol><li><p><strong>Security Boundary (Sandbox)</strong>: The LLM agent investigates the codebase using the Tool Registry. Every action taken by the tool registry runs exclusively inside an isolated Docker container, protecting the host system from potentially destructive commands.</p></li><li><p><strong>Determinism Boundary (Verifier)</strong>: Unlike typical LLM agent workflows where the model decides if it has completed a task, DevFix uses deterministic heuristics (checking process exit codes or HTTP status responses). If the agent fails to truly repair the environment, the verifier will return a failure and force the agent to continue its investigation.</p></li><li><p><strong>Telemetry Boundary</strong>: Before writing any conversation output to disk, the <code>TelemetryLogger</code> parses all output arrays, redacting known credential schemas (<code>sk-</code>, <code>Bearer</code>, etc.) to prevent secret leaks during presentation.</p></li></ol>`,6)])])}const k=e(t,[["render",r]]);export{E as __pageData,k as default};
