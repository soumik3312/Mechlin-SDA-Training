"use strict";

class AIContentGenerator {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);

        if (!this.container) {
            throw new Error(`Content generator container not found: ${containerId}`);
        }

        this.options = {
            apiUrl: "/api/ai/generate",
            maxTopicLength: 500,
            ...options,
        };

        this.isGenerating = false;
        this.lastRequest = null;
        this.generatedContent = "";

        this.createUI();
        this.bindEvents();
    }

    createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    createField(labelText, control, id) {
        const group = this.createElement("div", "ai-generator__field");
        const label = this.createElement("label", "", labelText);

        label.htmlFor = id;
        control.id = id;

        group.append(label, control);
        return group;
    }

    createSelect(id, options) {
        const select = document.createElement("select");
        select.className = "ai-generator__control";
        select.id = id;

        for (const item of options) {
            const option = document.createElement("option");
            option.value = item.value;
            option.textContent = item.label;
            select.append(option);
        }

        return select;
    }

    createInput(id, placeholder, maxLength) {
        const input = document.createElement("input");
        input.type = "text";
        input.id = id;
        input.className = "ai-generator__control";
        input.placeholder = placeholder;

        if (maxLength) {
            input.maxLength = maxLength;
        }

        return input;
    }

    createUI() {
        this.root = this.createElement("section", "ai-generator");

        const heading = this.createElement(
            "div",
            "ai-generator__heading",
        );

        heading.append(
            this.createElement("h3", "", "AI Content Generator"),
            this.createElement(
                "p",
                "",
                "Create articles, posts, emails, and product descriptions with local AI.",
            ),
        );

        this.form = document.createElement("form");
        this.form.className = "ai-generator__form";

        this.contentType = this.createSelect("ai-content-type", [
            { value: "article", label: "Article" },
            { value: "blog-post", label: "Blog Post" },
            { value: "social-media", label: "Social Media Post" },
            { value: "email", label: "Email" },
            { value: "product-description", label: "Product Description" },
        ]);

        this.topic = this.createInput(
            "ai-content-topic",
            "Enter the topic or subject…",
            this.options.maxTopicLength,
        );
        this.topic.required = true;

        this.tone = this.createSelect("ai-content-tone", [
            { value: "professional", label: "Professional" },
            { value: "casual", label: "Casual" },
            { value: "friendly", label: "Friendly" },
            { value: "formal", label: "Formal" },
            { value: "creative", label: "Creative" },
        ]);

        this.length = this.createSelect("ai-content-length", [
            { value: "short", label: "Short · 100–200 words" },
            { value: "medium", label: "Medium · 200–500 words" },
            { value: "long", label: "Long · 500+ words" },
        ]);

        this.keywords = this.createInput(
            "ai-content-keywords",
            "e.g. technology, productivity, learning",
            500,
        );

        this.generateButton = this.createElement(
            "button",
            "ai-generator__button ai-generator__button--primary",
            "Generate Content",
        );
        this.generateButton.type = "submit";

        this.form.append(
            this.createField("Content type", this.contentType, "ai-content-type"),
            this.createField("Topic or subject", this.topic, "ai-content-topic"),
            this.createField("Writing tone", this.tone, "ai-content-tone"),
            this.createField("Content length", this.length, "ai-content-length"),
            this.createField("Keywords (optional)", this.keywords, "ai-content-keywords"),
            this.generateButton,
        );

        this.status = this.createElement(
            "p",
            "ai-generator__status",
            "Ready to generate content.",
        );
        this.status.setAttribute("role", "status");
        this.status.setAttribute("aria-live", "polite");

        this.resultSection = this.createElement(
            "section",
            "ai-generator__result",
        );
        this.resultSection.hidden = true;

        const resultHeader = this.createElement(
            "div",
            "ai-generator__result-header",
        );

        resultHeader.append(
            this.createElement("h4", "", "Generated Content"),
        );

        this.copyButton = this.createElement(
            "button",
            "ai-generator__button ai-generator__button--secondary",
            "Copy",
        );
        this.copyButton.type = "button";

        this.regenerateButton = this.createElement(
            "button",
            "ai-generator__button ai-generator__button--secondary",
            "Regenerate",
        );
        this.regenerateButton.type = "button";

        const actions = this.createElement("div", "ai-generator__actions");
        actions.append(this.copyButton, this.regenerateButton);
        resultHeader.append(actions);

        this.resultContent = this.createElement(
            "pre",
            "ai-generator__output",
        );
        this.resultContent.setAttribute("aria-label", "Generated content");

        this.resultSection.append(resultHeader, this.resultContent);
        this.root.append(heading, this.form, this.status, this.resultSection);

        this.container.replaceChildren(this.root);
    }

    bindEvents() {
        this.form.addEventListener("submit", (event) => {
            event.preventDefault();
            this.generateContent();
        });

        this.regenerateButton.addEventListener("click", () => {
            if (this.lastRequest) {
                this.generateContent(this.lastRequest);
            }
        });

        this.copyButton.addEventListener("click", () => {
            this.copyContent();
        });
    }

    getFormData() {
        return {
            content_type: this.contentType.value,
            topic: this.topic.value.trim(),
            tone: this.tone.value,
            length: this.length.value,
            keywords: this.keywords.value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
                .slice(0, 12),
        };
    }

    validateRequest(data) {
        if (!data.topic) {
            throw new Error("Please enter a topic.");
        }

        if (data.topic.length > this.options.maxTopicLength) {
            throw new Error(
                `Topic must not exceed ${this.options.maxTopicLength} characters.`,
            );
        }

        if (data.keywords.some((keyword) => keyword.length > 60)) {
            throw new Error("Each keyword must not exceed 60 characters.");
        }
    }

    async generateContent(requestData = null) {
        if (this.isGenerating) {
            return;
        }

        const data = requestData || this.getFormData();

        try {
            this.validateRequest(data);
        } catch (error) {
            this.setStatus(error.message, "error");
            this.topic.focus();
            return;
        }

        this.lastRequest = { ...data, keywords: [...data.keywords] };
        this.isGenerating = true;
        this.setLoading(true);
        this.setStatus("Generating with your local Mistral model…", "loading");
        this.resultSection.hidden = true;

        try {
            const response = await fetch(this.options.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(data),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.error || `Generation failed (${response.status}).`,
                );
            }

            if (
                result.success !== true
                || typeof result.content !== "string"
                || !result.content.trim()
            ) {
                throw new Error("The AI service returned no generated content.");
            }

            this.generatedContent = result.content;
            this.resultContent.textContent = result.content;
            this.resultSection.hidden = false;

            this.setStatus(
                `Content generated successfully · ${result.metadata?.model || "Local AI"}`,
                "success",
            );
        } catch (error) {
            console.error("AI content generation failed:", error);

            this.setStatus(
                error.message || "Could not generate content. Please try again.",
                "error",
            );
        } finally {
            this.isGenerating = false;
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.generateButton.disabled = loading;
        this.regenerateButton.disabled = loading || !this.lastRequest;
        this.copyButton.disabled = loading || !this.generatedContent;
        this.generateButton.textContent = loading
            ? "Generating…"
            : "Generate Content";

        this.root.setAttribute("aria-busy", String(loading));
    }

    setStatus(message, state = "info") {
        this.status.textContent = message;
        this.status.dataset.state = state;
    }

    async copyContent() {
        if (!this.generatedContent) {
            this.setStatus("There is no generated content to copy.", "error");
            return;
        }

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(this.generatedContent);
            } else {
                this.copyUsingTemporaryInput(this.generatedContent);
            }

            this.setStatus("Content copied to clipboard.", "success");
        } catch (error) {
            console.error("Clipboard copy failed:", error);
            this.setStatus(
                "Could not copy automatically. Select the generated text and copy it manually.",
                "error",
            );
        }
    }

    copyUsingTemporaryInput(content) {
        const temporary = document.createElement("textarea");
        temporary.value = content;
        temporary.setAttribute("readonly", "");
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";

        document.body.append(temporary);
        temporary.select();

        const successful = document.execCommand("copy");
        temporary.remove();

        if (!successful) {
            throw new Error("Browser clipboard fallback failed.");
        }
    }
}

window.AIContentGenerator = AIContentGenerator;