
# AI-powered Requirements → Automation-ready Playwright Tests

## Summary
This design describes an automated pipeline that converts requirements (documents, tickets, spreadsheets, or plain text) into automation-ready Playwright tests using:
- n8n AI Agents + n8n workflow orchestration
- LLM-powered transformations and synthesis
- Automated document processing (OCR, parsers)
- Playwright for test execution
- Test engineering best practices and human-in-the-loop review

The goal: minimize manual effort to produce well-structured, maintainable UI tests with traceability from requirement → test case → code.

---

## High-level architecture
1. Input sources:
   - Requirements documents (PDF, Word, scanned)
   - Jira/Asana/GitHub issues or feature tickets
   - Spreadsheets or Confluence pages
2. Document processing:
   - OCR (for scans), structured extraction (tables/sections), text normalization
3. Requirement analysis:
   - LLM converts prose to structured test cases (Gherkin or JSON test spec)
4. Test generation:
   - LLM (with templates) generates Playwright test skeletons and selectors
5. Validation & QA:
   - Static linting, selector validation (DOM checks / heuristics), human review
6. Delivery:
   - Commit generated tests to repo, open PR, run CI, notify stakeholders

ASCII diagram:
Input -> Document Processing -> n8n Trigger -> LLM Analysis -> Test Case Schema -> LLM Codegen -> Static Validation -> PR commit -> CI Run -> Report -> Feedback loop

---

## Components & Technologies
- n8n (orchestration): triggers, integrations, AI Agent nodes, flows
- LLM(s): OpenAI / Anthropic / local LLM via n8n LLM node for:
  - requirement understanding
  - test case generation
  - code generation
- OCR / Document AI: Google Cloud Vision / Azure OCR / Tesseract + layout parsers for PDFs and scanned docs
- Playwright (TypeScript) for automated tests
- Repo hosting / CI: GitHub/GitLab + GitHub Actions/GitLab CI
- Storage & artifact registry: S3 / Git LFS for attachments
- Monitoring / reporting: Test reporting (Allure, Playwright HTML), dashboards (Grafana)
- Human review: Slack/MS Teams/email approvals, PR reviews

---

## Data model & schema

Define a canonical JSON schema for each derived test case that LLMs should produce. Use this schema for downstream generation and traceability.

Example JSON Test Case Schema:
{
  "id": "REQ-123_TC-01",
  "requirement_id": "REQ-123",
  "title": "Login with valid credentials",
  "description": "User logs in with valid email and password",
  "priority": "P1",
  "preconditions": ["User account exists"],
  "postconditions": ["User lands on dashboard"],
  "type": "E2E",
  "tags": ["login", "smoke"],
  "steps": [
    {"action": "navigate", "target": "https://app.example.com/login"},
    {"action": "fill", "target": "input#email", "value": "{{testData.email}}"},
    {"action": "fill", "target": "input#password", "value": "{{testData.password}}"},
    {"action": "click", "target": "button[type=submit]"},
    {"action": "assert", "target": "h1.dashboard", "operator": "visible"}
  ],
  "testData": {"email": "user@example.com", "password": "Password123"},
  "selectorHints": [{"target":"input#email","hint":"name=email or id=email or data-testid=email-input"}],
  "source_document": {"type":"JIRA","id":"FEAT-456","extract_page":2},
  "confidence": 0.92
}

Use JSON Schema validation node in n8n to validate outputs.

---

## n8n workflow (nodes & flow)

This is a recommended n8n flow blueprint (node names and purpose). Adapt node types to your n8n instance.

1. Trigger (Webhook or Poll):
   - Node: Webhook / Schedule / Event (Jira webhook)
   - Accepts payloads or file attachments

2. File Fetch (if links provided):
   - Node: HTTP Request or Drive integration
   - Download attachments (PDF, DOCX)

3. Document Processing:
   - Node: Function or External API call -> call OCR / Document AI service
   - Parse headings, tables, requirement IDs, acceptance criteria
   - Output: normalized text blocks with metadata

4. n8n AI Agent - Requirement Extractor:
   - Node: n8n AI Agents (or LLM node)
   - Prompt: extract requirement statements, acceptance criteria, flows
   - Output: JSON list of requirement objects

5. LLM - Test Case Synthesizer:
   - Node: LLM (OpenAI/Anthropic)
   - Input: normalized requirement + schema prompt
   - Use instruction to output strict JSON following schema (no additional text)
   - Output: list of test case JSONs

6. JSON Schema Validator:
   - Node: Validate test JSON against schema
   - If invalid -> send to manual review queue

7. Selector Hints & DOM Analysis:
   - Node: (Optional) Headless DOM snapshotter or rules-based selector guesser
   - If URL available, open page in headless browser to locate stable selectors (data-testid)
   - Enrich test JSON with selectors, alternate selectors, and stability score

8. LLM - Playwright Code Generator:
   - Node: LLM
   - Input: test JSON + project style guide (page objects / fixtures)
   - Output: TypeScript Playwright test file(s). Use single-file and/or page-object generation as per style.

9. Code Linting & Static Checks:
   - Node: Run remote or local linter (ESLint, TypeScript compiler) via container or remote runner
   - If fails -> annotate and send to human or re-run codegen with stricter template

10. Git Commit / Branch & PR:
   - Node: Git node or HTTP Request to GitHub API
   - Create branch, add files, commit, and open PR with description that links to requirement IDs and includes generated test artifacts and a traceability matrix

11. CI Trigger:
   - Node: Trigger GitHub Actions workflow or call CI API to run generated tests (smoke/e2e)
   - Collect results

12. Reporting & Notification:
   - Node: Post results to Slack/Teams/email and update ticketing system with test links and status
   - Attach Playwright HTML report and metrics

13. Human-in-the-loop Review (if configured):
   - Node: Approval node / Manual Review via UI or Slack message with accept/reject buttons
   - On reject -> capture reviewer notes -> push back to LLM with correction context and re-run codegen

14. Metrics & Observability:
   - Node: Post telemetry to metrics endpoint (time-to-generate, pass rate, flake rate, confidence scores)

Error handling:
- Branch on validation failures, missing selectors, or low confidence
- Escalate to human reviewers or trigger alternative flows

---

## LLM prompt templates & engineering

1. Requirement Extraction prompt (concise):
System: "You are an expert QA test engineer. Extract discrete requirements and acceptance criteria from the following text. Output a JSON array of requirement objects with keys: id, title, acceptance_criteria, priority, raw_text. Output only JSON."

User: "<document text>"

2. Test Case Synthesis prompt (use strict schema):
System: "You are an expert test designer and Playwright engineering lead. For each requirement produce test cases in the EXACT JSON Schema provided. Do NOT add commentary. If any field is unknown set it to null. Use Gherkin-style in the description if helpful. Minimize verbosity. Ensure selectors are best-effort hints but may be updated by DOM analysis."

User: "Requirement: {requirement_text}\nSchema: {schema}\nReturn JSON array of test cases."

3. Playwright code generation prompt:
System: "You are a Playwright test generator. Given a test case JSON and project style guide, generate a TypeScript Playwright test file that:
- uses Playwright Test runner
- uses page-objects for re-usable flows
- reads test data from fixtures/test-data.ts
- includes test.title composed from requirement_id and test id
- contains comments referencing source requirement and confidence score
Return only the TypeScript file content."

User: "{test_case_json}\n{project_style_guide}"

Important: include few-shot examples in prompt to improve structure. Force the LLM to return only JSON or code to simplify parsing.

---

## Example Playwright test (generated)

Example: tests/login.spec.ts
// Test generated from REQ-123_TC-01 (confidence 0.92)
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import testData from '../fixtures/test-data';

test.describe('REQ-123 - Login', () => {
  test('TC-01: Login with valid credentials', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillEmail(testData.validUser.email);
    await login.fillPassword(testData.validUser.password);
    await login.submit();
    await expect(login.dashboardHeader).toBeVisible();
  });
});

Example page object: pages/login.page.ts
import { Page, Locator } from '@playwright/test';
export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly submitBtn: Locator;
  readonly dashboardHeader: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.locator('input#email, input[name="email"], [data-testid="email"]');
    this.password = page.locator('input#password, input[name="password"], [data-testid="password"]');
    this.submitBtn = page.locator('button[type="submit"], [data-testid="login-btn"]');
    this.dashboardHeader = page.locator('h1.dashboard, [data-testid="dashboard-title"]');
  }

  async goto() {
    await this.page.goto('https://app.example.com/login');
  }
  async fillEmail(value: string) { await this.email.fill(value); }
  async fillPassword(value: string) { await this.password.fill(value); }
  async submit() { await this.submitBtn.click(); }
}

Fixture (fixtures/test-data.ts):
export default {
  validUser: { email: 'user@example.com', password: 'Password123' }
};

Project structure recommendation:
/tests
/pages
/fixtures
/utils
/playwright.config.ts
/package.json
/README.md

---

## Test engineering best practices (enforced by pipeline)
- Single responsibility tests: one assertion intent per test where practical
- Page Objects & Reusability: generate page objects to reduce flakiness and duplication
- Test Data Management: separate test data fixtures; use factories and seeded accounts
- Idempotency: tests should reset state or run against test data environments
- Stability & selectors: prefer data-testid attributes; fall back to robust CSS/XPath; include alternate selectors
- Tagging: include tags (smoke, regression, e2e) in generated tests for selective runs
- Traceability: embed requirement IDs in test metadata and PR description; generate traceability matrix
- Lint & Formatting: ESLint, Prettier, TypeScript checks on generated files
- Flake detection: re-run failing tests; if flakiness detected, create ticket for stabilization
- Security: avoid embedding secrets in tests; use vaults or CI secrets

---

## CI/CD integration (GitHub Actions example)
- Workflow triggered on PR from generator branch
- Steps:
  1. checkout
  2. install node deps
  3. lint and type-check (ESLint, tsc)
  4. run Playwright tests with project=generated-smoke (headless or headed)
  5. upload Playwright report/artifacts
  6. comment PR with test results and report link

Example job names: validate-generated-tests, run-generated-smoke

n8n should call GitHub API to create branch and PR. PR template includes automated checklist:
- [ ] Code compiles
- [ ] Tests pass
- [ ] Selector validation passed
- [ ] Manual review (if required)

---

## Quality gates & metrics
Quality gates before merging generated tests:
- JSON schema validation pass
- Lint & compile pass
- Selector stability score above threshold (e.g., 0.6)
- Auto-run of generated smoke tests passes
- Human approval (optional)

Key metrics to track:
- Time from requirement to PR
- Number of generated tests per requirement
- Generator confidence distribution
- Test pass rate (first run)
- Flaky rate (re-runs / total runs)
- Reviewer rejection rate
- Time to stabilize flakey tests

---

## Human-in-the-loop policy
- Low-confidence outputs (confidence < threshold) go to manual review.
- Require human approval before merging tests that run against production-like environments.
- Review UI shows: original requirement excerpt, generated test JSON, generated code, selector suggestions, fail-safe revert.

---

## Example rejection & feedback loop
Reviewer marks test as "needs amendment" with comments. n8n captures comments and re-runs LLM prompt including reviewer feedback:
- "Fix step 3 to wait for element X, prefer data-testid 'login-submit'. Re-generate Playwright with explicit wait."

Store reviewer decisions and use them as few-shot examples to improve future LLM responses.

---

## Security, governance & cost controls
- Limit LLM temperature for deterministic outputs (0 - 0.2)
- Enforce response size limits and streaming off for cost predictability
- Audit logs for generated content and who approved it
- Rate limits for automated generation to control LLM spend

---

## Roadmap & roll-out plan (3 phases)
Phase 1 (MVP - 4 weeks):
- Build n8n pipeline for text/ticket inputs
- Integrate basic OCR and LLM to produce JSON test cases
- Generate Playwright skeletons and create PRs to a test repo
- Basic CI to run generated smoke tests

Phase 2 (stabilize - 6 weeks):
- Add selector DOM analysis, data-driven tests, page-objects
- Human review UI & approvals
- Linting, security, and reporting
- Add test data management & environment orchestration

Phase 3 (scale - ongoing):
- Expand supported input channels (Confluence, emails)
- Telemetry dashboards, flake detection & auto-issue creation
- Continual improvement (feedback loop training examples)
- Governance, RBAC, and approvals for production test generation

---

## Risks & Mitigations
- Incorrect selectors → mitigation: DOM analysis & human review; use data-testid policies with devs
- LLM hallucinations → mitigation: strict schema, validation nodes, confidence thresholds, human approvals
- Cost overruns from LLM usage → mitigation: batching, smaller models for extraction, caching
- Security leakage → mitigation: scrub secrets, VPCs for OCR & document storage, audit logs

---

## Implementation tips & practical notes
- Use deterministic LLM settings and strict response format to ease parsing.
- Provide the LLM with a short style guide and code examples (few-shot).
- Prefer iterative generation: synthesize JSON test spec first, then code generation step.
- Maintain a library of selectors or a site-model database that the generator consults.
- Use synthetic or sandbox test environments to validate generated tests quickly.

---

---

# PART 2: n8n JSON Export / Blueprint

Below is a complete n8n workflow JSON export (version 1.0 compatible). Import this directly into n8n to get a working template. Adapt credentials, URLs, and LLM keys to your environment.

```json
{
  "name": "Requirements → Playwright Tests (AI-powered)",
  "nodes": [
    {
      "parameters": {
        "path": "/generate-tests",
        "method": "POST",
        "authentication": "basicAuth",
        "options": {}
      },
      "id": "uuid1",
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 150]
    },
    {
      "parameters": {
        "url": "=https://vision.googleapis.com/v1/images:annotateText?key={{$env.GCP_VISION_KEY}}",
        "method": "POST",
        "headers": {},
        "body": "={\n  \"requests\": [{\n    \"image\": {\"content\": \"{{$node[\\\"Webhook Trigger\\\"].json.body.file_content}}\"},\n    \"features\": [{\"type\": \"DOCUMENT_TEXT_DETECTION\"}]\n  }]\n}"
      },
      "id": "uuid2",
      "name": "OCR - Document AI",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [450, 150]
    },
    {
      "parameters": {
        "text": "={\n  \"document_text\": {{$node[\"OCR - Document AI\"].json.responses[0].fullTextAnnotation.text}},\n  \"file_name\": {{$node[\"Webhook Trigger\"].json.body.file_name}}\n}"
      },
      "id": "uuid3",
      "name": "Parse Extracted Text",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [650, 150]
    },
    {
      "parameters": {
        "url": "={{$env.OPENAI_API_BASE}}/chat/completions",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer {{$env.OPENAI_API_KEY}}",
          "Content-Type": "application/json"
        },
        "body": "={\n  \"model\": \"gpt-4\",\n  \"temperature\": 0.1,\n  \"max_tokens\": 2000,\n  \"messages\": [\n    {\n      \"role\": \"system\",\n      \"content\": \"You are an expert QA engineer. Extract requirements from the document text and output ONLY valid JSON (no extra text). Use this schema: {\\\"requirements\\\": [{\\\"id\\\": \\\"REQ-XXX\\\", \\\"title\\\": \\\"str\\\", \\\"acceptance_criteria\\\": [\\\"str\\\"], \\\"priority\\\": \\\"P1|P2|P3\\\"}]}\"\n    },\n    {\n      \"role\": \"user\",\n      \"content\": \"Document text:\\n{{$node[\\\"Parse Extracted Text\\\"].json.document_text}}\"\n    }\n  ]\n}"
      },
      "id": "uuid4",
      "name": "LLM - Extract Requirements",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [850, 150]
    },
    {
      "parameters": {
        "functionCode": "const result = $node['LLM - Extract Requirements'].json.choices[0].message.content;\ntry {\n  return JSON.parse(result);\n} catch (e) {\n  return { error: 'Failed to parse LLM response', raw: result };\n}"
      },
      "id": "uuid5",
      "name": "Validate Requirement JSON",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [1050, 150]
    },
    {
      "parameters": {
        "url": "={{$env.OPENAI_API_BASE}}/chat/completions",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer {{$env.OPENAI_API_KEY}}",
          "Content-Type": "application/json"
        },
        "body": "={\n  \"model\": \"gpt-4\",\n  \"temperature\": 0.1,\n  \"max_tokens\": 3000,\n  \"messages\": [\n    {\n      \"role\": \"system\",\n      \"content\": \"You are a test case designer. Convert requirements to Playwright test cases in ONLY JSON format (no extra text). Schema: {\\\"test_cases\\\": [{\\\"id\\\": \\\"REQ-XXX_TC-01\\\", \\\"title\\\": \\\"str\\\", \\\"description\\\": \\\"str\\\", \\\"steps\\\": [{\\\"action\\\": \\\"navigate|fill|click|assert\\\", \\\"target\\\": \\\"selector\\\", \\\"value\\\": \\\"str\\\"}], \\\"expected_result\\\": \\\"str\\\", \\\"tags\\\": [\\\"smoke\\\"]}]}\"\n    },\n    {\n      \"role\": \"user\",\n      \"content\": \"Requirement: {{$node['Validate Requirement JSON'].json.requirements[0].title}}\\n\\nAcceptance Criteria:\\n{{$node['Validate Requirement JSON'].json.requirements[0].acceptance_criteria.join('\\\\n')}}\"\n    }\n  ]\n}"
      },
      "id": "uuid6",
      "name": "LLM - Synthesize Test Cases",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [1250, 150]
    },
    {
      "parameters": {
        "functionCode": "const result = $node['LLM - Synthesize Test Cases'].json.choices[0].message.content;\ntry {\n  return JSON.parse(result);\n} catch (e) {\n  return { error: 'Failed to parse test cases', raw: result };\n}"
      },
      "id": "uuid7",
      "name": "Parse Test Cases JSON",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [1450, 150]
    },
    {
      "parameters": {
        "url": "={{$env.OPENAI_API_BASE}}/chat/completions",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer {{$env.OPENAI_API_KEY}}",
          "Content-Type": "application/json"
        },
        "body": "={\n  \"model\": \"gpt-4\",\n  \"temperature\": 0.05,\n  \"max_tokens\": 4000,\n  \"messages\": [\n    {\n      \"role\": \"system\",\n      \"content\": \"You are a Playwright test code generator. Generate TypeScript Playwright tests only (no commentary). Use page objects. Include test data from fixtures. Return only the TypeScript code block.\"\n    },\n    {\n      \"role\": \"user\",\n      \"content\": \"Test case:\\n{{JSON.stringify($node['Parse Test Cases JSON'].json.test_cases[0], null, 2)}}\\n\\nGenerate a Playwright test file with proper imports, page objects, and fixtures.\"\n    }\n  ]\n}"
      },
      "id": "uuid8",
      "name": "LLM - Generate Playwright Code",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [1650, 150]
    },
    {
      "parameters": {
        "fileFormat": "=.spec.ts",
        "fileName": "=generated-{{$node['Parse Test Cases JSON'].json.test_cases[0].id}}.spec.ts",
        "mimeType": "text/plain",
        "fileContent": "={{$node['LLM - Generate Playwright Code'].json.choices[0].message.content}}"
      },
      "id": "uuid9",
      "name": "Write Test File",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [1850, 150]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "owner": "={{$env.GITHUB_OWNER}}",
        "repo": "={{$env.GITHUB_TEST_REPO}}",
        "createPullRequest": true,
        "branch": "={{$env.GITHUB_BASE_BRANCH}}",
        "branchName": "=auto/generated-tests-{{Date.now()}}",
        "options": {
          "createLabels": true,
          "labels": \"automated,generated-tests\"\n        }\n      },\n      \"id\": \"uuid10\",\n      \"name\": \"GitHub - Create PR\",\n      \"type\": \"n8n-nodes-base.github\",\n      \"typeVersion\": 1.1,\n      \"position\": [2050, 150]\n    },\n    {\n      \"parameters\": {\n        \"url\": \"=https://api.github.com/repos/{{$env.GITHUB_OWNER}}/{{$env.GITHUB_TEST_REPO}}/actions/workflows/run-tests.yml/dispatches\",\n        \"method\": \"POST\",\n        \"headers\": {\n          \"Authorization\": \"token {{$env.GITHUB_TOKEN}}\",\n          \"Accept\": \"application/vnd.github.v3+json\"\n        },\n        \"body\": \"={\\\"ref\\\": \\\"{{$node['GitHub - Create PR'].json.head.ref}}\\\", \\\"inputs\\\": {}}\"\n      },\n      \"id\": \"uuid11\",\n      \"name\": \"GitHub Actions - Trigger Test Run\",\n      \"type\": \"n8n-nodes-base.httpRequest\",\n      \"typeVersion\": 4.1,\n      \"position\": [2250, 150]\n    },\n    {\n      \"parameters\": {\n        \"url\": \"={{$env.SLACK_WEBHOOK_URL}}\",\n        \"method\": \"POST\",\n        \"body\": \"={\\\"text\\\": \\\"✅ Generated tests for {{$node['Parse Test Cases JSON'].json.test_cases[0].id}}. PR: {{$node['GitHub - Create PR'].json.html_url}}\\\", \\\"blocks\\\": [{\\\"type\\\": \\\"section\\\", \\\"text\\\": {\\\"type\\\": \\\"mrkdwn\\\", \\\"text\\\": \\\"*Generated Playwright Tests*\\\\n{{$node['Parse Test Cases JSON'].json.test_cases[0].title}}\\\\n<{{$node['GitHub - Create PR'].json.html_url}}|View PR>\\\"}}]}\"\n      },\n      \"id\": \"uuid12\",\n      \"name\": \"Slack Notification\",\n      \"type\": \"n8n-nodes-base.httpRequest\",\n      \"typeVersion\": 4.1,\n      \"position\": [2450, 150]\n    }\n  ],\n  \"connections\": {\n    \"Webhook Trigger\": { \"main\": [[{ \"node\": \"OCR - Document AI\", \"type\": \"main\", \"index\": 0 }]] },\n    \"OCR - Document AI\": { \"main\": [[{ \"node\": \"Parse Extracted Text\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Parse Extracted Text\": { \"main\": [[{ \"node\": \"LLM - Extract Requirements\", \"type\": \"main\", \"index\": 0 }]] },\n    \"LLM - Extract Requirements\": { \"main\": [[{ \"node\": \"Validate Requirement JSON\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Validate Requirement JSON\": { \"main\": [[{ \"node\": \"LLM - Synthesize Test Cases\", \"type\": \"main\", \"index\": 0 }]] },\n    \"LLM - Synthesize Test Cases\": { \"main\": [[{ \"node\": \"Parse Test Cases JSON\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Parse Test Cases JSON\": { \"main\": [[{ \"node\": \"LLM - Generate Playwright Code\", \"type\": \"main\", \"index\": 0 }]] },\n    \"LLM - Generate Playwright Code\": { \"main\": [[{ \"node\": \"Write Test File\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Write Test File\": { \"main\": [[{ \"node\": \"GitHub - Create PR\", \"type\": \"main\", \"index\": 0 }]] },\n    \"GitHub - Create PR\": { \"main\": [[{ \"node\": \"GitHub Actions - Trigger Test Run\", \"type\": \"main\", \"index\": 0 }, { \"node\": \"Slack Notification\", \"type\": \"main\", \"index\": 0 }]] }\n  }\n}
```

**Environment variables required in n8n:**
- `GCP_VISION_KEY`: Google Cloud Vision API key (for OCR)
- `OPENAI_API_BASE`: OpenAI API endpoint (e.g., https://api.openai.com/v1)
- `OPENAI_API_KEY`: OpenAI API key
- `GITHUB_OWNER`: GitHub organization/user
- `GITHUB_TEST_REPO`: Target repository name
- `GITHUB_TOKEN`: GitHub personal access token
- `GITHUB_BASE_BRANCH`: Base branch (e.g., main)
- `SLACK_WEBHOOK_URL`: Slack incoming webhook for notifications

---

# PART 3: Concrete LLM Prompt Examples with Few-Shot Samples

## 3.1 Requirement Extraction Prompt (Few-Shot)

```
SYSTEM PROMPT:
You are an expert QA engineer and test architect with 10+ years of experience extracting testable requirements from business documents. Your job is to parse requirements documents and output ONLY valid JSON (no explanations, no markdown, no extra text).

You must output a JSON object matching this exact schema:
{
  "requirements": [
    {
      "id": "REQ-XXX",
      "title": "short requirement title",
      "description": "full description of the requirement",
      "acceptance_criteria": ["criterion 1", "criterion 2", "criterion 3"],
      "priority": "P1" | "P2" | "P3",
      "type": "functional" | "non-functional",
      "users_affected": ["role1", "role2"],
      "raw_excerpt": "original text from document"
    }
  ]
}

--- EXAMPLES (Few-Shot) ---

EXAMPLE 1 INPUT:
"The system must allow users to log in with email and password. Users should see an error message if credentials are invalid. After successful login, the dashboard should be displayed within 2 seconds. Acceptance: valid email format, password minimum 8 chars, error message in red, dashboard loads in < 2s."

EXAMPLE 1 OUTPUT:
{
  "requirements": [
    {
      "id": "REQ-001",
      "title": "User login with email and password",
      "description": "System allows users to authenticate using email and password credentials",
      "acceptance_criteria": [
        "Valid email format is required",
        "Password must be minimum 8 characters",
        "Invalid credentials display error message in red text",
        "Successful login displays dashboard within 2 seconds"
      ],
      "priority": "P1",
      "type": "functional",
      "users_affected": ["end_user", "guest"],
      "raw_excerpt": "The system must allow users to log in with email and password..."
    }
  ]
}

EXAMPLE 2 INPUT:
"Feature: Search for products. As a customer, I want to search the catalog by keyword so that I can find items quickly. Given a product exists with name 'Blue Widget', when I search for 'Blue', then the product appears in results. Acceptance: search returns results in < 500ms, results are sorted by relevance, no more than 100 results per page."

EXAMPLE 2 OUTPUT:
{
  "requirements": [
    {
      "id": "REQ-002",
      "title": "Product search by keyword",
      "description": "Customers can search the product catalog by keyword to find items quickly",
      "acceptance_criteria": [
        "Search returns matching products within 500ms",
        "Results are sorted by relevance score",
        "Results are paginated with maximum 100 items per page",
        "Search handles partial keyword matches"
      ],
      "priority": "P1",
      "type": "functional",
      "users_affected": ["customer"],
      "raw_excerpt": "Feature: Search for products. As a customer..."
    }
  ]
}

--- END EXAMPLES ---

Now, extract requirements from the provided document text. Output ONLY the JSON object.
```

**USER INPUT:**
```
"Admin users need to generate reports from the analytics dashboard. The report must include sales data, user metrics, and export options (PDF, CSV, Excel). Reports should be cacheable for 1 hour to improve performance. Date range filter is required. Acceptance: can generate report in < 5 seconds, supports all three export formats, caching verified."
```

**EXPECTED OUTPUT:**
```json
{
  "requirements": [
    {
      "id": "REQ-003",
      "title": "Generate analytics reports with multiple export formats",
      "description": "Admin users can generate comprehensive analytics reports including sales data and user metrics with support for multiple export formats",
      "acceptance_criteria": [
        "Report generation completes within 5 seconds",
        "Supports PDF, CSV, and Excel export formats",
        "Includes date range filter for time-period selection",
        "Report results are cached for 1 hour",
        "Dashboard displays sales data and user metrics"
      ],
      "priority": "P1",
      "type": "functional",
      "users_affected": ["admin"],
      "raw_excerpt": "Admin users need to generate reports from the analytics dashboard..."
    }
  ]
}
```

---

## 3.2 Test Case Synthesis Prompt (Few-Shot)

```
SYSTEM PROMPT:
You are a master test case designer specializing in Playwright and end-to-end testing. Convert business requirements into concrete, atomic test cases in ONLY JSON format (no extra text).

Output schema (strict):
{
  "test_cases": [
    {
      "id": "REQ-XXX_TC-01",
      "requirement_id": "REQ-XXX",
      "title": "descriptive test title",
      "description": "what the test verifies",
      "priority": "P1" | "P2" | "P3",
      "tags": ["smoke", "regression", "e2e"],
      "preconditions": ["precondition 1"],
      "postconditions": ["postcondition 1"],
      "steps": [
        {
          "step_no": 1,
          "action": "navigate" | "fill" | "click" | "assert" | "wait" | "select",
          "target": "CSS selector or element description",
          "value": "value to use (if applicable)",
          "expected": "expected outcome"
        }
      ],
      "test_data": {
        "email": "test@example.com",
        "password": "TestPass123!"
      },
      "selector_hints": [
        { "description": "email input", "selectors": ["input#email", "input[name='email']", "[data-testid='email']"] }
      ],
      "confidence": 0.95
    }
  ]
}

--- EXAMPLES (Few-Shot) ---

EXAMPLE 1 - REQUIREMENT:
REQ-001: User login with email and password
Acceptance criteria:
- Valid email format required
- Password minimum 8 characters
- Invalid credentials show error message
- Dashboard appears after successful login

EXAMPLE 1 - TEST CASES OUTPUT:
{
  "test_cases": [
    {
      "id": "REQ-001_TC-01",
      "requirement_id": "REQ-001",
      "title": "Successful login with valid credentials",
      "description": "Verify user can log in with valid email and password and is redirected to dashboard",
      "priority": "P1",
      "tags": ["smoke", "regression", "authentication"],
      "preconditions": ["User account exists with email test@example.com"],
      "postconditions": ["User is logged in and on dashboard page"],
      "steps": [
        {
          "step_no": 1,
          "action": "navigate",
          "target": "https://app.example.com/login",
          "value": null,
          "expected": "Login page loads"
        },
        {
          "step_no": 2,
          "action": "fill",
          "target": "input#email",
          "value": "test@example.com",
          "expected": "Email field populated"
        },
        {
          "step_no": 3,
          "action": "fill",
          "target": "input#password",
          "value": "TestPass123!",
          "expected": "Password field populated (masked)"
        },
        {
          "step_no": 4,
          "action": "click",
          "target": "button[type='submit']",
          "value": null,
          "expected": "Form submitted"
        },
        {
          "step_no": 5,
          "action": "wait",
          "target": "h1.dashboard-title",
          "value": "3000",
          "expected": "Dashboard header visible within 3 seconds"
        }
      ],
      "test_data": {
        "email": "test@example.com",
        "password": "TestPass123!"
      },
      "selector_hints": [
        { "description": "email input field", "selectors": ["input#email", "input[name='email']", "[data-testid='login-email']"] },
        { "description": "password input field", "selectors": ["input#password", "input[name='password']", "[data-testid='login-password']"] },
        { "description": "submit button", "selectors": ["button[type='submit']", "[data-testid='login-submit']", "button:has-text('Login')"] },
        { "description": "dashboard header", "selectors": ["h1.dashboard-title", "[data-testid='dashboard-header']", "h1:has-text('Dashboard')"] }
      ],
      "confidence": 0.95
    },
    {
      "id": "REQ-001_TC-02",
      "requirement_id": "REQ-001",
      "title": "Login fails with invalid email format",
      "description": "Verify system rejects invalid email formats and displays appropriate error",
      "priority": "P2",
      "tags": ["regression", "validation"],
      "preconditions": ["User is on login page"],
      "postconditions": ["Error message displayed, user remains on login page"],
      "steps": [
        {
          "step_no": 1,
          "action": "navigate",
          "target": "https://app.example.com/login",
          "value": null,
          "expected": "Login page loads"
        },
        {
          "step_no": 2,
          "action": "fill",
          "target": "input#email",
          "value": "invalidemail",
          "expected": "Invalid email typed in field"
        },
        {
          "step_no": 3,
          "action": "fill",
          "target": "input#password",
          "value": "TestPass123!",
          "expected": "Password field populated"
        },
        {
          "step_no": 4,
          "action": "click",
          "target": "button[type='submit']",
          "value": null,
          "expected": "Submit clicked"
        },
        {
          "step_no": 5,
          "action": "assert",
          "target": "div.error-message",
          "value": null,
          "expected": "Error message visible with validation text"
        }
      ],
      "test_data": {
        "invalid_email": "invalidemail",
        "password": "TestPass123!"
      },
      "selector_hints": [
        { "description": "error message", "selectors": ["div.error-message", "[data-testid='login-error']", "div[role='alert']"] }
      ],
      "confidence": 0.88
    }
  ]
}

--- END EXAMPLES ---

Now, synthesize test cases for the given requirement:
```

---

## 3.3 Playwright Code Generation Prompt (Few-Shot)

```
SYSTEM PROMPT:
You are an expert Playwright test engineer. Generate TypeScript Playwright test code ONLY (no explanations, comments outside code, or markdown).

Requirements:
1. Use @playwright/test runner
2. Import page objects from ../pages/
3. Use fixtures for test data from ../fixtures/test-data
4. Include test metadata (requirement ID, confidence score)
5. Use descriptive test.title composed of requirement and test ID
6. Use page objects for UI interactions
7. Include proper error handling and assertions
8. Follow ES6+ syntax and TypeScript strict mode
9. Avoid hardcoding selectors in tests; use page objects

Project style guide:
- Page object methods are async and descriptive (e.g., fillEmail, clickSubmit)
- Tests are grouped by feature using test.describe()
- Use test.beforeEach for common setup
- Assertions use expect() from Playwright
- No console.log; use test reporter for output

--- EXAMPLE PLAYWRIGHT TEST CODE ---

Example test file structure:
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import testData from '../fixtures/test-data';

test.describe('REQ-001 - Authentication', () => {
  test('TC-01: Successful login with valid credentials', async ({ page }) => {
    // Setup
    const loginPage = new LoginPage(page);
    const user = testData.validUser;

    // Execute
    await loginPage.goto();
    await loginPage.fillEmail(user.email);
    await loginPage.fillPassword(user.password);
    await loginPage.submit();

    // Verify
    await expect(loginPage.dashboardHeader).toBeVisible();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('TC-02: Login fails with invalid email', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.fillEmail('invalid');
    await loginPage.fillPassword(testData.validUser.password);
    await loginPage.submit();

    await expect(loginPage.errorMessage).toContainText('Invalid email format');
    await expect(page).toHaveURL(/login/);
  });
});

--- END EXAMPLE ---

Generate the test file now:
```

**EXAMPLE INPUT:**
```
Test case ID: REQ-002_TC-01
Title: Product search returns results
Description: User searches for "Blue Widget" and sees results in under 500ms
Steps:
1. Navigate to https://shop.example.com
2. Fill search input with "Blue Widget"
3. Click search button
4. Assert results visible (max 100 items)
5. Assert search time < 500ms

Selectors:
- Search input: input[name="search"], input#search-box, [data-testid="search-input"]
- Search button: button[type="submit"], [data-testid="search-btn"], button:has-text("Search")
- Results list: ul.results, [data-testid="search-results"], div.product-list
```

**EXPECTED OUTPUT:**
```typescript
import { test, expect } from '@playwright/test';
import { SearchPage } from '../pages/search.page';
import testData from '../fixtures/test-data';

// REQ-002_TC-01 | Confidence: 0.92
test.describe('REQ-002 - Product Search', () => {
  test('TC-01: Search returns matching products within time limit', async ({ page }) => {
    const searchPage = new SearchPage(page);
    const startTime = Date.now();

    // Navigate to search page
    await searchPage.goto();

    // Perform search
    await searchPage.fillSearchBox(testData.searchTerms.blueWidget);
    await searchPage.clickSearchButton();

    // Wait for results and measure time
    await expect(searchPage.resultsList).toBeVisible();
    const searchTime = Date.now() - startTime;

    // Verify results
    const resultCount = await searchPage.getResultCount();
    expect(resultCount).toBeLessThanOrEqual(100);
    expect(searchTime).toBeLessThan(500);
  });
});
```

---

## 3.4 Few-Shot Prompt for Selector Robustness

```
SYSTEM PROMPT:
You are an expert in Web Testing. Given a test case step that requires an element selector, generate robust CSS selectors with fallbacks.

Output JSON format:
{
  "primary_selector": "CSS selector with highest stability",
  "fallback_selectors": ["alternative selector 1", "alternative selector 2"],
  "reasoning": "why this selector is robust",
  "stability_score": 0.95
}

EXAMPLES:

EXAMPLE 1 - LOGIN EMAIL INPUT
Input: "Email input field on login form"
Output:
{
  "primary_selector": "input[data-testid='email-input']",
  "fallback_selectors": ["input#email", "input[name='email']", "input[placeholder='Email Address']"],
  "reasoning": "data-testid is most stable as it's explicitly set for testing; fallbacks cover ID, name, and placeholder approaches",
  "stability_score": 0.96
}

EXAMPLE 2 - DYNAMIC PRODUCT ITEM
Input: "Product card for 'Blue Widget' in search results"
Output:
{
  "primary_selector": "[data-testid='product-card'][data-product-id='12345']",
  "fallback_selectors": ["article:has-text('Blue Widget')", "div.product-card:has(img[alt='Blue Widget'])"],
  "reasoning": "data-testid with product ID is most specific; fallbacks use text and image alt matching for dynamic content",
  "stability_score": 0.88
}
```

---

# PART 4: Sample Repository Scaffold & Playwright Project Structure

Generate this folder and file structure in your test repository:

```
playwright-test-repo/
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .gitignore
├── README.md
├── tests/
│   ├── fixtures/
│   │   ├── test-data.ts
│   │   ├── authenticated-user.fixture.ts
│   │   └── db-setup.fixture.ts
│   ├── pages/
│   │   ├── base.page.ts
│   │   ├── login.page.ts
│   │   ├── dashboard.page.ts
│   │   └── search.page.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── wait-conditions.ts
│   │   └── test-helpers.ts
│   ├── generated-tests/
│   │   ├── generated-REQ-001.spec.ts
│   │   ├── generated-REQ-002.spec.ts
│   │   └── README.md
│   └── specs/
│       ├── auth.spec.ts
│       ├── search.spec.ts
│       └── dashboard.spec.ts
├── reports/
│   ├── .gitkeep
│   └── allure-results/ (generated at runtime)
├── scripts/
│   ├── setup-env.sh
│   ├── run-generated-tests.sh
│   └── generate-traceability-matrix.js
└── docs/
    ├── PROJECT_SETUP.md
    ├── SELECTORS_GUIDE.md
    └── TEST_MAINTENANCE.md
```

---

## 4.1 playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'junit-results.xml' }],
    ['list'],
  ],
  use: {
    baseURL: 'https://app.example.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 5000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  globalSetup: require.resolve('./tests/fixtures/global-setup.ts'),
});
```

---

## 4.2 package.json

```json
{
  "name": "playwright-ai-generated-tests",
  "version": "1.0.0",
  "description": "AI-generated Playwright test suite from requirements",
  "main": "index.js",
  "scripts": {
    "test": "playwright test",
    "test:generated": "playwright test tests/generated-tests",
    "test:smoke": "playwright test --grep @smoke",
    "test:debug": "playwright test --debug",
    "report": "playwright show-report",
    "lint": "eslint tests/**/*.ts",
    "format": "prettier --write tests/**/*.ts",
    "type-check": "tsc --noEmit"
  },
  "keywords": ["playwright", "e2e", "testing", "ai"],
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "dotenv": "^16.0.0"
  }
}
```

---

## 4.3 tests/pages/login.page.ts

```typescript
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly dashboardHeader: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use primary selector with fallbacks for robustness
    this.emailInput = page.locator(
      'input[data-testid="email-input"], input#email, input[name="email"]'
    );
    this.passwordInput = page.locator(
      'input[data-testid="password-input"], input#password, input[name="password"]'
    );
    this.submitButton = page.locator(
      'button[data-testid="login-submit"], button[type="submit"], button:has-text("Login")'
    );
    this.errorMessage = page.locator(
      'div[data-testid="error-message"], div.error, div[role="alert"]'
    );
    this.dashboardHeader = page.locator(
      'h1[data-testid="dashboard-title"], h1.dashboard, h1:has-text("Dashboard")'
    );
  }

  async goto() {
    await this.page.goto('/login');
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async getErrorText(): Promise<string> {
    return this.errorMessage.textContent() || '';
  }
}
```

---

## 4.4 tests/fixtures/test-data.ts

```typescript
export default {
  baseURL: 'https://app.example.com',
  timeout: 30000,

  validUser: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  },

  invalidUsers: [
    {
      email: 'invalid-email',
      password: 'TestPassword123!',
      expectedError: 'Invalid email format',
    },
    {
      email: 'test@example.com',
      password: 'short',
      expectedError: 'Password must be at least 8 characters',
    },
  ],

  searchTerms: {
    blueWidget: 'Blue Widget',
    redGadget: 'Red Gadget',
    nonExistent: 'XYZ-NonExistent-Product-999',
  },

  expectedResults: {
    searchTimeout: 500,
    maxResultsPerPage: 100,
    dashboardLoadTime: 2000,
  },
};
```

---

## 4.5 tests/specs/auth.spec.ts (Manual + AI-generated mix)

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import testData from '../fixtures/test-data';

test.describe('REQ-001 - User Authentication', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('[MANUAL] TC-01: Successful login with valid credentials @smoke', async () => {
    // Manual test for baseline coverage
    await loginPage.fillEmail(testData.validUser.email);
    await loginPage.fillPassword(testData.validUser.password);
    await loginPage.submit();
    await expect(loginPage.dashboardHeader).toBeVisible();
  });

  test('[GENERATED] TC-02: Invalid email format rejection @regression', async () => {
    // AI-generated test from REQ-001_TC-02 (confidence 0.88)
    const invalidUser = testData.invalidUsers[0];
    await loginPage.fillEmail(invalidUser.email);
    await loginPage.fillPassword(invalidUser.password);
    await loginPage.submit();
    await expect(loginPage.errorMessage).toContainText(invalidUser.expectedError);
  });
});
```

---

## 4.6 tests/generated-tests/generated-REQ-001.spec.ts (AI-generated example)

```typescript
// AUTO-GENERATED TEST
// Source: REQ-001 - User Authentication
// Generated: 2024-01-15T10:30:00Z
// Confidence: 0.92
// Requirement ID: REQ-001

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import testData from '../fixtures/test-data';

test.describe('REQ-001 - User Authentication', () => {
  test('TC-01: Successful login with valid credentials', async ({ page }) => {
    // Precondition: User account exists
    const loginPage = new LoginPage(page);
    const user = testData.validUser;

    // Step 1: Navigate to login page
    await loginPage.goto();
    await expect(page).toHaveURL(/login/);

    // Step 2-3: Fill email and password
    await loginPage.fillEmail(user.email);
    await loginPage.fillPassword(user.password);

    // Step 4: Submit form
    const startTime = Date.now();
    await loginPage.submit();

    // Step 5: Verify dashboard appears
    await expect(loginPage.dashboardHeader).toBeVisible({ timeout: 3000 });
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);

    // Postcondition: User is on dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('TC-02: Login fails with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.fillEmail('test@example.com');
    await loginPage.fillPassword('WrongPassword123');
    await loginPage.submit();

    // Verify error message
    const errorText = await loginPage.getErrorText();
    expect(errorText).toContain('Invalid credentials');
    await expect(page).toHaveURL(/login/);
  });
});
```

---

## 4.7 README.md (Setup & Maintenance Guide)

```markdown
# Playwright AI-Generated Test Suite

This repository contains end-to-end Playwright tests automatically generated from business requirements via AI + n8n orchestration.

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation
\`\`\`bash
npm install
npx playwright install
\`\`\`

### Running Tests
\`\`\`bash
# All tests
npm test

# Only generated tests
npm run test:generated

# Smoke tests (tagged @smoke)
npm run test:smoke

# Debug mode
npm run test:debug
\`\`\`

### View Reports
\`\`\`bash
npm run report
\`\`\`

## Project Structure

- **tests/pages/**: Page Object Model classes for UI pages
- **tests/fixtures/**: Test data and shared fixtures
- **tests/specs/**: Manually-written test suites
- **tests/generated-tests/**: AI-generated test suites (auto-committed via n8n)
- **tests/utils/**: Helper functions and utilities

## Generated Test Quality

All generated tests are:
- ✅ Validated against JSON schema
- ✅ Linted (ESLint + TypeScript)
- ✅ Run in CI before PR merge
- ✅ Traced back to source requirement (REQ-XXX ID)
- ✅ Include confidence score and metadata

## Maintenance

### Updating Selectors
If tests break due to UI changes:
1. Edit the corresponding page object in `tests/pages/`
2. Add fallback selectors using multiple locator strategies
3. Run tests to verify fix
4. Create issue for regeneration if test is AI-generated

### Reviewing Generated Tests
- Confidence score < 0.80? Manual review required before merging
- Check test file header for source requirement ID and metadata
- Validate selector robustness (data-testid preferred)

### Contributing Manual Tests
1. Create test in `tests/specs/<feature>.spec.ts`
2. Tag with @smoke, @regression, @e2e as appropriate
3. Use page objects from `tests/pages/`
4. Run \`npm run lint\` and \`npm run type-check\`
5. Submit PR

## Links

- **AI Workflow**: See [AI-powered Requirements-to-Playwright Workflow.md](../AI-powered%20Requirements-to-Playwright%20Workflow.md)
- **Traceability**: [Traceability Matrix](./docs/TRACEABILITY.md)
- **Selectors Guide**: [Selector Best Practices](./docs/SELECTORS_GUIDE.md)
```

---

## Summary: Complete AI Workflow Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Input** | PDF/DOCX/Jira/Confluence | Source requirements & tickets |
| **Processing** | Google Vision OCR, LLMs | Document extraction & parsing |
| **Orchestration** | n8n | Workflow automation & AI Agent coordination |
| **Analysis** | GPT-4 / Claude | Requirement understanding & test design |
| **Generation** | OpenAI/Anthropic LLM | Test code generation |
| **Validation** | ESLint, TypeScript, JSON Schema | Quality gates |
| **Testing** | Playwright | Automated test execution |
| **CI/CD** | GitHub Actions | Test automation & PR integration |
| **Reporting** | Playwright HTML, Allure, Slack | Results & notifications |
| **Storage** | GitHub | Test code repository |

**Total Time-to-Test**: ~2-5 minutes from requirement upload to PR created and CI running.
**Quality**: AI confidence scoring + human review gates ensure maintainability.
