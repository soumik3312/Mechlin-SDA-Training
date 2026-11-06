"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const status = document.getElementById("service-status");

    try {
        const response = await fetch("/health", {
            headers: { Accept: "application/json" },
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.status !== "healthy") {
            throw new Error(result.error || "AI service is not healthy.");
        }

        status.textContent = `Connected · ${result.model || "Local AI"}`;
        status.dataset.state = "success";
    } catch (error) {
        console.error("AI service health check failed:", error);
        status.textContent = "Backend unavailable · Start the Flask service";
        status.dataset.state = "error";
    }

    try {
        new AIChatbot("chatbot-container", {
            apiUrl: "/api/ai/chat",
            memoryUrl: "/api/ai/memory/clear",
            agentType: "conversation",
            title: "AI Assistant",
            theme: "light",
        });

        new AIContentGenerator("content-generator-container", {
            apiUrl: "/api/ai/generate",
        });

        new AIRecommendations("recommendations-container", {
            apiUrl: "/api/ai/recommendations",
            profileUrl: "/api/ai/recommendations/profile",
            feedbackUrl: "/api/ai/recommendations/feedback",
            maxRecommendations: 5,
        });

        new AIAnalytics("analytics-container", {
            apiUrl: "/api/ai/analytics",
        });
    } catch (error) {
        console.error("Could not initialize AI web components:", error);

        status.textContent = "Some web components could not initialize.";
        status.dataset.state = "error";
    }
});