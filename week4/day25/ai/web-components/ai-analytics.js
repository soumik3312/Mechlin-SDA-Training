"use strict";

class AIAnalytics {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);

        if (!this.container) {
            throw new Error(`Analytics container not found: ${containerId}`);
        }

        this.options = {
            apiUrl: "/api/ai/analytics",
            ...options,
        };

        this.isLoading = false;
        this.createUI();
        this.bindEvents();
        this.loadAnalytics();
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

    createUI() {
        this.root = this.createElement("section", "ai-analytics");

        const header = this.createElement(
            "div",
            "ai-analytics__header",
        );

        const heading = this.createElement("div", "");
        heading.append(
            this.createElement("h3", "", "AI Usage Analytics"),
            this.createElement(
                "p",
                "",
                "Live usage metrics recorded by this local application.",
            ),
        );

        this.refreshButton = this.createElement(
            "button",
            "ai-web-button ai-web-button--secondary",
            "Refresh",
        );
        this.refreshButton.type = "button";

        header.append(heading, this.refreshButton);

        this.status = this.createElement(
            "p",
            "ai-analytics__status",
            "Loading analytics…",
        );
        this.status.setAttribute("role", "status");
        this.status.setAttribute("aria-live", "polite");

        this.metrics = this.createElement(
            "div",
            "ai-analytics__metrics",
        );

        this.note = this.createElement(
            "p",
            "ai-analytics__note",
        );

        this.root.append(header, this.status, this.metrics, this.note);
        this.container.replaceChildren(this.root);
    }

    bindEvents() {
        this.refreshButton.addEventListener("click", () => {
            this.loadAnalytics();
        });
    }

    async loadAnalytics() {
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.refreshButton.disabled = true;
        this.status.textContent = "Refreshing analytics…";
        this.root.setAttribute("aria-busy", "true");

        try {
            const response = await fetch(this.options.apiUrl, {
                headers: { Accept: "application/json" },
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error || `Analytics request failed (${response.status}).`,
                );
            }

            this.renderAnalytics(result);
            this.status.textContent = "Analytics updated successfully.";
            this.status.dataset.state = "success";
        } catch (error) {
            console.error("Could not load analytics:", error);

            this.status.textContent = `Analytics unavailable: ${error.message}`;
            this.status.dataset.state = "error";
        } finally {
            this.isLoading = false;
            this.refreshButton.disabled = false;
            this.root.setAttribute("aria-busy", "false");
        }
    }

    renderAnalytics(result) {
        const events = result.events || {};
        const feedback = result.feedback || {};

        const metricItems = [
            {
                label: "Chat requests",
                value: events.chat || 0,
            },
            {
                label: "Content generations",
                value: events.content_generation || 0,
            },
            {
                label: "Recommendation requests",
                value: events.recommendations || 0,
            },
            {
                label: "Feedback submissions",
                value: feedback.count || 0,
            },
        ];

        this.metrics.replaceChildren();

        for (const item of metricItems) {
            const card = this.createElement(
                "article",
                "ai-analytics__metric",
            );

            card.append(
                this.createElement("span", "", item.label),
                this.createElement("strong", "", String(item.value)),
            );

            this.metrics.append(card);
        }

        const average = Number(feedback.average_rating);
        const averageText = Number.isFinite(average)
            ? `${average.toFixed(2)} / 4`
            : "Not rated yet";

        this.note.textContent =
            `Average recommendation rating: ${averageText}. `
            + (result.note || "");
    }
}

window.AIAnalytics = AIAnalytics;