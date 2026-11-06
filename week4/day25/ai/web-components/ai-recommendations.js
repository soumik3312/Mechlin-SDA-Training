"use strict";

class AIRecommendations {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);

        if (!this.container) {
            throw new Error(`Recommendations container not found: ${containerId}`);
        }

        this.options = {
            apiUrl: "/api/ai/recommendations",
            profileUrl: "/api/ai/recommendations/profile",
            feedbackUrl: "/api/ai/recommendations/feedback",
            maxRecommendations: 5,
            bookmarkStorageKey: "day25_ai_bookmarks",
            ...options,
        };

        this.userProfile = { interests: ["python", "ai", "web"] };
        this.recommendations = [];
        this.bookmarks = this.loadBookmarks();
        this.isLoading = false;
        this.createUI();
        this.bindEvents();
        this.loadUserProfile();
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
        this.root = this.createElement("section", "ai-recommendations");

        const header = this.createElement(
            "div",
            "ai-recommendations__header",
        );

        const heading = this.createElement("div", "");
        heading.append(
            this.createElement("h3", "", "Recommended for You"),
            this.createElement(
                "p",
                "",
                "Suggestions ranked by matching your interests with our learning catalogue.",
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
            "ai-recommendations__status",
            "Loading your profile…",
        );
        this.status.setAttribute("role", "status");
        this.status.setAttribute("aria-live", "polite");

        this.list = this.createElement(
            "div",
            "ai-recommendations__list",
        );

        this.feedbackSection = this.createElement(
            "section",
            "ai-recommendations__feedback",
        );
        this.feedbackSection.hidden = true;

        this.feedbackSection.append(
            this.createElement("h4", "", "How useful were these suggestions?"),
            this.createElement(
                "p",
                "",
                "Your feedback is saved locally by this demo backend.",
            ),
        );

        this.feedbackButtons = this.createElement(
            "div",
            "ai-recommendations__feedback-buttons",
        );

        const ratings = [
            { value: 1, label: "Not useful" },
            { value: 2, label: "A little useful" },
            { value: 3, label: "Useful" },
            { value: 4, label: "Very useful" },
        ];

        for (const rating of ratings) {
            const button = this.createElement(
                "button",
                "ai-web-button ai-web-button--feedback",
                `${rating.value} · ${rating.label}`,
            );

            button.type = "button";
            button.dataset.action = "feedback";
            button.dataset.rating = String(rating.value);
            button.setAttribute("aria-label", `Rate recommendations: ${rating.label}`);

            this.feedbackButtons.append(button);
        }

        this.feedbackSection.append(this.feedbackButtons);

        this.root.append(
            header,
            this.status,
            this.list,
            this.feedbackSection,
        );

        this.container.replaceChildren(this.root);
    }

    bindEvents() {
        this.refreshButton.addEventListener("click", () => {
            this.loadRecommendations();
        });

        this.root.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-action]");

            if (!button || !this.root.contains(button)) {
                return;
            }

            const action = button.dataset.action;

            if (action === "bookmark") {
                this.toggleBookmark(button.dataset.id);
            }

            if (action === "feedback") {
                this.submitFeedback(Number(button.dataset.rating));
            }
        });
    }

    loadBookmarks() {
        try {
            const parsed = JSON.parse(
                localStorage.getItem(this.options.bookmarkStorageKey) || "[]",
            );

            return new Set(
                Array.isArray(parsed)
                    ? parsed.filter((item) => typeof item === "string")
                    : [],
            );
        } catch (error) {
            console.warn("Could not load recommendation bookmarks:", error);
            return new Set();
        }
    }

    saveBookmarks() {
        try {
            localStorage.setItem(
                this.options.bookmarkStorageKey,
                JSON.stringify([...this.bookmarks]),
            );
        } catch (error) {
            console.warn("Could not save recommendation bookmarks:", error);
            this.setStatus("Bookmarks could not be saved in this browser.", "error");
        }
    }

    async requestJSON(url, options = {}) {
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
            },
            ...options,
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                result.error || `Request failed (${response.status}).`,
            );
        }

        return result;
    }

    async loadUserProfile() {
        this.setStatus("Loading your recommendation profile…", "loading");

        try {
            const result = await this.requestJSON(this.options.profileUrl);

            if (result.success && result.profile && typeof result.profile === "object") {
                this.userProfile = result.profile;
            }

            await this.loadRecommendations();
        } catch (error) {
            console.error("Could not load recommendation profile:", error);
            this.setStatus(
                `Could not load your profile: ${error.message}`,
                "error",
            );
        }
    }

    async loadRecommendations() {
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.setLoading(true);
        this.setStatus("Finding relevant recommendations…", "loading");

        try {
            const result = await this.requestJSON(this.options.apiUrl, {
                method: "POST",
                body: JSON.stringify({
                    user_profile: this.userProfile,
                    max_recommendations: this.options.maxRecommendations,
                }),
            });

            if (!result.success || !Array.isArray(result.recommendations)) {
                throw new Error("The recommendation service returned invalid data.");
            }

            this.recommendations = result.recommendations;
            this.displayRecommendations();

            this.feedbackSection.hidden = this.recommendations.length === 0;

            this.setStatus(
                `${this.recommendations.length} recommendations loaded · ${result.ranking_method || "Local ranking"}`,
                "success",
            );
        } catch (error) {
            console.error("Could not load recommendations:", error);
            this.list.replaceChildren();

            const message = this.createElement(
                "p",
                "ai-recommendations__empty",
                `Could not load recommendations: ${error.message}`,
            );

            this.list.append(message);
            this.setStatus("Recommendation request failed.", "error");
        } finally {
            this.isLoading = false;
            this.setLoading(false);
        }
    }

    displayRecommendations() {
        this.list.replaceChildren();

        if (this.recommendations.length === 0) {
            this.list.append(
                this.createElement(
                    "p",
                    "ai-recommendations__empty",
                    "No recommendations are available for this profile.",
                ),
            );
            return;
        }

        for (const recommendation of this.recommendations) {
            this.list.append(this.createRecommendationCard(recommendation));
        }
    }

    createRecommendationCard(recommendation) {
        const card = this.createElement(
            "article",
            "ai-recommendation-card",
        );

        const heading = this.createElement(
            "h4",
            "",
            recommendation.title || "Untitled recommendation",
        );

        const description = this.createElement(
            "p",
            "",
            recommendation.description || "",
        );

        const category = this.createElement(
            "span",
            "ai-recommendation-card__category",
            recommendation.category || "General",
        );

        const score = Number(recommendation.score);
        const scoreText = Number.isFinite(score)
            ? `Tag-match score: ${Math.round(score * 100)}%`
            : "Suggested item";

        const scoreLabel = this.createElement(
            "span",
            "ai-recommendation-card__score",
            scoreText,
        );

        const metadata = this.createElement(
            "div",
            "ai-recommendation-card__metadata",
        );
        metadata.append(category, scoreLabel);

        const actions = this.createElement(
            "div",
            "ai-recommendation-card__actions",
        );

        if (
            typeof recommendation.url === "string"
            && recommendation.url.startsWith("https://")
        ) {
            try {
                const url = new URL(recommendation.url);

                if (url.protocol === "https:") {
                    const link = this.createElement(
                        "a",
                        "ai-web-button ai-web-button--primary",
                        "View resource",
                    );
                    link.href = url.href;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    actions.append(link);
                }
            } catch (error) {
                console.warn("Ignoring invalid recommendation URL:", error);
            }
        }

        const isBookmarked = this.bookmarks.has(recommendation.id);

        const bookmarkButton = this.createElement(
            "button",
            "ai-web-button ai-web-button--secondary",
            isBookmarked ? "Saved" : "Bookmark",
        );
        bookmarkButton.type = "button";
        bookmarkButton.dataset.action = "bookmark";
        bookmarkButton.dataset.id = recommendation.id || "";
        bookmarkButton.setAttribute(
            "aria-pressed",
            String(isBookmarked),
        );

        actions.append(bookmarkButton);
        card.append(heading, description, metadata, actions);

        return card;
    }

    toggleBookmark(id) {
        if (!id) {
            return;
        }

        if (this.bookmarks.has(id)) {
            this.bookmarks.delete(id);
            this.setStatus("Recommendation removed from bookmarks.", "info");
        } else {
            this.bookmarks.add(id);
            this.setStatus("Recommendation bookmarked.", "success");
        }

        this.saveBookmarks();
        this.displayRecommendations();
    }

    async submitFeedback(rating) {
        if (![1, 2, 3, 4].includes(rating) || this.recommendations.length === 0) {
            return;
        }

        for (const button of this.feedbackButtons.querySelectorAll("button")) {
            button.disabled = true;
        }

        try {
            const result = await this.requestJSON(this.options.feedbackUrl, {
                method: "POST",
                body: JSON.stringify({
                    rating,
                    recommendations: this.recommendations,
                    user_profile: this.userProfile,
                }),
            });

            if (!result.success) {
                throw new Error(result.error || "Feedback was not saved.");
            }

            this.feedbackSection.replaceChildren(
                this.createElement(
                    "p",
                    "ai-recommendations__feedback-success",
                    "Thank you! Your feedback was saved.",
                ),
            );

            this.setStatus("Feedback submitted successfully.", "success");
        } catch (error) {
            console.error("Could not submit recommendation feedback:", error);
            this.setStatus(
                `Feedback could not be saved: ${error.message}`,
                "error",
            );

            for (const button of this.feedbackButtons.querySelectorAll("button")) {
                button.disabled = false;
            }
        }
    }

    setLoading(loading) {
        this.refreshButton.disabled = loading;
        this.root.setAttribute("aria-busy", String(loading));
    }

    setStatus(message, state = "info") {
        this.status.textContent = message;
        this.status.dataset.state = state;
    }
}

window.AIRecommendations = AIRecommendations;