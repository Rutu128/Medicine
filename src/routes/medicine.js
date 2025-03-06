import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// Get all medicines
router.get("/", async (req, res) => {
  try {
    const medicines = await prisma.medicine.findMany({
      orderBy: {
        name: "asc",
      },
    });

    res.json({ data: medicines });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Medicine search API with suggestions based on relevance
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      // If no query provided, return most popular/common medicines
      const popularMedicines = await prisma.medicine.findMany({
        take: 10,
        orderBy: {
          name: "asc", // In a real app, you might order by popularity or sales
        },
      });

      return res.json({
        data: popularMedicines,
        message: "Showing popular medicines",
      });
    }

    // Clean the search query
    const searchTerm = query.trim().toLowerCase();

    // Get all medicines that match the search term
    const allMatches = await prisma.medicine.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { type: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
    });

    // Custom relevance scoring function
    function calculateRelevance(medicine, searchTerm) {
      let score = 0;
      const nameLower = medicine.name.toLowerCase();
      const typeLower = medicine.type.toLowerCase();

      // Exact matches get highest priority
      if (nameLower === searchTerm) score += 100;
      if (typeLower === searchTerm) score += 80;

      // Starts with search term (high relevance)
      if (nameLower.startsWith(searchTerm)) score += 60;
      if (typeLower.startsWith(searchTerm)) score += 40;

      // Contains search term
      if (nameLower.includes(searchTerm)) score += 30;
      if (typeLower.includes(searchTerm)) score += 20;

      // Partial word matches (lowest relevance)
      const words = searchTerm.split(" ");
      for (const word of words) {
        if (word.length > 2) {
          if (nameLower.includes(word)) score += 10;
          if (typeLower.includes(word)) score += 5;
        }
      }

      return score;
    }

    // Calculate relevance scores for each medicine
    const scoredResults = allMatches.map((medicine) => ({
      ...medicine,
      relevanceScore: calculateRelevance(medicine, searchTerm),
    }));

    // Sort by relevance score (highest first) and take top 10
    const topResults = scoredResults
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10)
      .map(({ relevanceScore, ...medicine }) => medicine); // Remove the score from the final results

    res.json({
      data: topResults,
      message:
        topResults.length > 0
          ? `Showing top ${topResults.length} relevant results for "${query}"`
          : `No matches found for "${query}"`,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add suggestion API endpoint
router.get("/suggest/:term", async (req, res) => {
  try {
    const { term } = req.params;

    if (!term || term.trim() === "") {
      return res.status(400).json({ error: "Search term is required" });
    }

    const searchTerm = term.trim().toLowerCase();

    // First prioritize medicines that start with the search term
    const nameMatches = await prisma.medicine.findMany({
      where: {
        name: {
          startsWith: searchTerm,
          mode: "insensitive",
        },
      },
      take: 10,
      orderBy: {
        name: "asc",
      },
    });

    // If we don't have 10 results, add medicines that contain the term
    let suggestions = [...nameMatches];

    if (suggestions.length < 10) {
      const additionalMatches = await prisma.medicine.findMany({
        where: {
          AND: [
            {
              name: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
            {
              // Exclude medicines already in the suggestions
              id: {
                notIn: suggestions.map((m) => m.id),
              },
            },
          ],
        },
        take: 10 - suggestions.length,
        orderBy: {
          name: "asc",
        },
      });

      suggestions = [...suggestions, ...additionalMatches];
    }

    // If still not 10, add type matches
    if (suggestions.length < 10) {
      const typeMatches = await prisma.medicine.findMany({
        where: {
          AND: [
            {
              type: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
            {
              id: {
                notIn: suggestions.map((m) => m.id),
              },
            },
          ],
        },
        take: 10 - suggestions.length,
        orderBy: {
          name: "asc",
        },
      });

      suggestions = [...suggestions, ...typeMatches];
    }

    res.json({
      suggestions: suggestions.map((medicine) => ({
        id: medicine.id,
        name: medicine.name,
        type: medicine.type,
        price: medicine.price,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
