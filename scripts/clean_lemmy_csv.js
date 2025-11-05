import fs from "fs";
const CSV_FILE = "lemmy_communities.csv";

function cleanCSV() {
    if (!fs.existsSync(CSV_FILE)) {
        console.error("CSV file not found.");
        return;
    }
    const lines = fs.readFileSync(CSV_FILE, "utf8").split("\n");
    if (lines.length < 2) {
        console.log("CSV file is empty or only has header.");
        return;
    }
    const header = lines[0];
    const cleaned = [header];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(",");
        // subscribers is the 4th column (index 3)
        const subscribers = Number(cols[3].replace(/"/g, ""));
        if (subscribers >= 10) cleaned.push(line);
    }
    fs.writeFileSync(CSV_FILE, cleaned.join("\n") + "\n", "utf8");
    console.log(`Cleaned CSV. Remaining rows: ${cleaned.length - 1}`);
}

cleanCSV();