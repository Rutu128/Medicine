import cron from "node-cron"
import axios from "axios";
const API_URL = "https://point-allocation-system.onrender.com/"; // Replace with your actual API

// Schedule the cron job to run every 10 minutes
cron.schedule("*/10 * * * *", async () => {
  try {
    console.log("🔄 Cron job started: Calling API...");

    const response = await axios.get(API_URL);
    console.log("✅ API Response:", response.data);
    
  } catch (error) {
    console.error("❌ Error calling API:", error.message);
  }
});

console.log("⏳ Cron job scheduled to run every 10 minutes.");
