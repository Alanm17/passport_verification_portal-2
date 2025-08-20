const express = require("express");
const fileUpload = require("express-fileupload");
const Tesseract = require("tesseract.js");
// Simple string similarity function using Levenshtein distance
function calculateSimilarity(str1, str2) {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const maxLen = Math.max(len1, len2);
  return 1 - matrix[len2][len1] / maxLen;
}
const moment = require("moment");

const app = express();
const PORT = 8000;

// Middleware
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    abortOnLimit: true,
  })
);
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Enhanced MRZ parsing with better field extraction and fallback
function parseMRZ(text) {
  console.log("Raw OCR text:", text);

  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, "").toUpperCase())
    .filter((line) => line.length >= 20);

  console.log("Processed lines:", lines);

  if (lines.length >= 2) {
    // Find potential MRZ lines
    const mrzLines = lines.filter(
      (line) =>
        (line.match(/</g) || []).length > 3 ||
        (line.length >= 30 && /^[A-Z0-9<]+$/.test(line))
    );

    console.log("Potential MRZ lines:", mrzLines);

    if (mrzLines.length >= 2) {
      const mrz1 = mrzLines[mrzLines.length - 2];
      const mrz2 = mrzLines[mrzLines.length - 1];

      console.log("MRZ Line 1:", mrz1);
      console.log("MRZ Line 2:", mrz2);

      try {
        const result = {
          documentType: mrz1.charAt(0) || "",
          issuingCountry: mrz1.slice(2, 5).replace(/</g, "") || "",
          surname: mrz1.slice(5, 44).split("<<")[0]?.replace(/</g, "") || "",
          givenNames: mrz1.slice(5, 44).split("<<")[1]?.replace(/</g, "") || "",

          passportNumber: mrz2.slice(0, 9).replace(/</g, "") || "",
          checkDigit1: mrz2.charAt(9) || "",
          nationality: mrz2.slice(10, 13).replace(/</g, "") || "",
          dateOfBirth: formatMRZDate(mrz2.slice(13, 19)) || "",
          checkDigit2: mrz2.charAt(19) || "",
          gender: mrz2.charAt(20) || "",
          expiryDate: formatMRZDate(mrz2.slice(21, 27)) || "",
          checkDigit3: mrz2.charAt(27) || "",
          personalNumber: mrz2.slice(28, 42).replace(/</g, "") || "",
          checkDigit4: mrz2.charAt(42) || "",
          compositeCheckDigit: mrz2.charAt(43) || "",

          rawMRZ1: mrz1,
          rawMRZ2: mrz2,
          rawText: text,
        };

        // Build full name from MRZ
        const firstName = result.givenNames || "";
        const lastName = result.surname || "";
        result.fullName = `${firstName} ${lastName}`.trim();

        // Try to get better name from human-readable text if MRZ parsing seems wrong
        if (result.fullName.length > 50 || result.fullName.includes("LLLL")) {
          console.log(
            "MRZ name seems corrupted, trying to extract from readable text"
          );
          const readableNames = extractNamesFromReadableText(text);
          if (readableNames.fullName) {
            result.fullName = readableNames.fullName;
            result.surname = readableNames.surname || result.surname;
            result.givenNames = readableNames.givenNames || result.givenNames;
            result.extractionMethod = "hybrid"; // MRZ + readable text
          }
        }

        console.log("Parsed MRZ result:", result);
        return result;
      } catch (error) {
        console.error("Error parsing MRZ:", error);
        return { rawText: text, error: "MRZ parsing failed: " + error.message };
      }
    }
  }

  // Fallback: try to extract data from non-MRZ text
  console.log("No MRZ found, attempting fallback extraction");
  return extractPassportFallback(text);
}

// Extract names from human-readable passport text
function extractNamesFromReadableText(text) {
  const lines = text.split("\n");
  const result = {};

  // Look for surname and given names in the readable part
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Look for surname after "SURNAME" or "FAMLIYAS!"
    if (line.match(/SURNAME|FAMLIYAS!/i)) {
      const nextLine = lines[i + 1]?.trim();
      if (
        nextLine &&
        nextLine.length > 0 &&
        !nextLine.match(/GIVEN|NAMES|SEX|DATE/i)
      ) {
        result.surname = nextLine;
      }
    }

    // Look for given names after "GIVEN NAMES"
    if (line.match(/GIVEN.*NAMES|GVEN.*NAMES/i)) {
      const nextLine = lines[i + 1]?.trim();
      if (
        nextLine &&
        nextLine.length > 0 &&
        !nextLine.match(/SEX|DATE|PLACE|BIRTH/i)
      ) {
        result.givenNames = nextLine;
      }
    }
  }

  // Build full name
  if (result.surname && result.givenNames) {
    result.fullName = `${result.givenNames} ${result.surname}`;
  } else if (result.surname) {
    result.fullName = result.surname;
  } else if (result.givenNames) {
    result.fullName = result.givenNames;
  }

  console.log("Extracted names from readable text:", result);
  return result;
}

// Fallback extraction for when MRZ is not readable
function extractPassportFallback(text) {
  console.log("Using fallback extraction for:", text);

  const lines = text.split("\n");
  const result = { rawText: text, extractionMethod: "fallback" };

  // Common passport field patterns
  const patterns = {
    passportNumber: [
      /passport\s+no[:\.\s]+([A-Z0-9]+)/i,
      /passport\s+number[:\.\s]+([A-Z0-9]+)/i,
      /no[:\.\s]+([A-Z0-9]{6,12})/i,
      /^([A-Z]{2}\d{7})$/,
      /^([A-Z]\d{8})$/,
    ],
    fullName: [
      /name[:\.\s]+(.+)/i,
      /surname[:\.\s]+(.+)/i,
      /holder[:\.\s]+(.+)/i,
    ],
    dateOfBirth: [
      /date\s+of\s+birth[:\.\s]+(.+)/i,
      /dob[:\.\s]+(.+)/i,
      /birth\s+date[:\.\s]+(.+)/i,
      /born[:\.\s]+(.+)/i,
    ],
    nationality: [/nationality[:\.\s]+(.+)/i, /citizen\s+of[:\.\s]+(.+)/i],
    gender: [/sex[:\.\s]+([MFX])/i, /gender[:\.\s]+([MFX])/i],
    placeOfBirth: [
      /place\s+of\s+birth[:\.\s]+(.+)/i,
      /birth\s+place[:\.\s]+(.+)/i,
    ],
    expiryDate: [
      /expiry[:\.\s]+(.+)/i,
      /expires[:\.\s]+(.+)/i,
      /valid\s+until[:\.\s]+(.+)/i,
    ],
  };

  // Extract data using patterns
  for (const line of lines) {
    for (const [field, patternList] of Object.entries(patterns)) {
      if (!result[field]) {
        for (const pattern of patternList) {
          const match = line.match(pattern);
          if (match) {
            result[field] = match[1].trim();
            console.log(`Found ${field}: ${result[field]}`);
            break;
          }
        }
      }
    }
  }

  return result;
}

// Format MRZ date (YYMMDD) to readable format
function formatMRZDate(mrzDate) {
  if (!mrzDate || mrzDate.length !== 6) return mrzDate;

  const year = parseInt(mrzDate.slice(0, 2));
  const month = mrzDate.slice(2, 4);
  const day = mrzDate.slice(4, 6);

  // Assume years 00-30 are 2000-2030, 31-99 are 1931-1999
  const fullYear = year <= 30 ? 2000 + year : 1900 + year;

  return `${fullYear}-${month}-${day}`;
}

// Extract additional passport data from OCR text
function extractPassportDetails(text) {
  const lines = text.split("\n");
  const result = {};

  // Look for place of birth
  const placeOfBirthPatterns = [
    /place\s+of\s+birth[:\s]+(.+)/i,
    /birth\s+place[:\s]+(.+)/i,
    /lieu\s+de\s+naissance[:\s]+(.+)/i,
  ];

  for (const line of lines) {
    for (const pattern of placeOfBirthPatterns) {
      const match = line.match(pattern);
      if (match) {
        result.placeOfBirth = match[1].trim();
        break;
      }
    }
  }

  // Look for issuing authority
  const issuingAuthorityPatterns = [
    /issuing\s+authority[:\s]+(.+)/i,
    /issued\s+by[:\s]+(.+)/i,
    /authority[:\s]+(.+)/i,
  ];

  for (const line of lines) {
    for (const pattern of issuingAuthorityPatterns) {
      const match = line.match(pattern);
      if (match) {
        result.issuingAuthority = match[1].trim();
        break;
      }
    }
  }

  // Look for issue date
  const issueDatePatterns = [
    /date\s+of\s+issue[:\s]+(.+)/i,
    /issue\s+date[:\s]+(.+)/i,
    /issued[:\s]+(.+)/i,
  ];

  for (const line of lines) {
    for (const pattern of issueDatePatterns) {
      const match = line.match(pattern);
      if (match) {
        result.issueDate = match[1].trim();
        break;
      }
    }
  }

  return result;
}

// Enhanced passport extraction with multiple OCR attempts
async function extractPassport(file) {
  try {
    const buffer = file.data;
    console.log(
      `Processing passport file: ${file.name}, size: ${buffer.length} bytes`
    );

    // Try multiple OCR configurations
    const ocrConfigs = [
      {
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_char_whitelist:
          "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz<>/-., ",
      },
      {
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<",
      },
      {
        tessedit_pageseg_mode: Tesseract.PSM.AUTO_OSD,
      },
    ];

    let bestResult = null;
    let bestScore = 0;

    for (const [index, config] of ocrConfigs.entries()) {
      try {
        console.log(`Trying OCR configuration ${index + 1}...`);

        const {
          data: { text },
        } = await Tesseract.recognize(buffer, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
          ...config,
        });

        console.log(
          `OCR ${index + 1} extracted text:`,
          text.substring(0, 200) + "..."
        );

        const mrzData = parseMRZ(text);
        const additionalData = extractPassportDetails(text);
        const result = { ...mrzData, ...additionalData };

        // Score the result based on how many fields we extracted
        const fields = [
          "passportNumber",
          "fullName",
          "dateOfBirth",
          "nationality",
          "gender",
        ];
        const score = fields.filter(
          (field) => result[field] && result[field] !== ""
        ).length;

        console.log(`OCR ${index + 1} score: ${score}/5 fields extracted`);

        if (score > bestScore) {
          bestScore = score;
          bestResult = result;
        }

        // If we got a good result, break early
        if (score >= 4) break;
      } catch (error) {
        console.error(`OCR configuration ${index + 1} failed:`, error.message);
        continue;
      }
    }

    if (!bestResult) {
      throw new Error("All OCR attempts failed");
    }

    bestResult.validation = validatePassportData(bestResult);
    console.log("Final result:", bestResult);

    return bestResult;
  } catch (error) {
    console.error("Error extracting passport data:", error);
    return { error: error.message, rawText: "" };
  }
}

// Enhanced translated document extraction
async function extractTranslatedDoc(file) {
  try {
    const buffer = file.data;
    console.log(
      `Processing translated document: ${file.name}, size: ${buffer.length} bytes`
    );

    const {
      data: { text },
    } = await Tesseract.recognize(buffer, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(
            `Translation OCR Progress: ${Math.round(m.progress * 100)}%`
          );
        }
      },
    });

    console.log("Translated document text:", text);

    const lines = text.split("\n");
    const data = {};

    // Enhanced field extraction patterns
    const patterns = {
      student_name: [
        /^([A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+)$/m,
        /student\s+name[:\s]+(.+)/i,
        /name\s+of\s+student[:\s]+(.+)/i,
        /full\s+name[:\s]+(.+)/i,
        /([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/,
      ],
      father_name: [
        /father[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        /father['\s]*s?\s+name[:\s]+(.+)/i,
        /name\s+of\s+father[:\s]+(.+)/i,
      ],
      mother_name: [
        /mother[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        /mother['\s]*s?\s+name[:\s]+(.+)/i,
        /name\s+of\s+mother[:\s]+(.+)/i,
      ],
      dob: [
        /date\s+of\s+birth[:\s]+(.+)/i,
        /dob[:\s]+(.+)/i,
        /birth\s+date[:\s]+(.+)/i,
        /born[:\s]+(.+)/i,
      ],
      place_of_birth: [
        /place\s+of\s+birth[:\s]+(.+)/i,
        /birth\s+place[:\s]+(.+)/i,
        /born\s+in[:\s]+(.+)/i,
      ],
      nationality: [
        /nationality[:\s]+(.+)/i,
        /\(ethnic\)[:\s]*(.+)/i,
        /citizen\s+of[:\s]+(.+)/i,
      ],
    };

    // Extract data using patterns
    for (const line of lines) {
      for (const [key, patternList] of Object.entries(patterns)) {
        if (!data[key]) {
          for (const pattern of patternList) {
            const match = line.match(pattern);
            if (match) {
              data[key] = match[1].trim();
              console.log(`Found ${key}: ${data[key]}`);
              break;
            }
          }
        }
      }
    }

    // Try to extract student name from the document structure
    if (!data.student_name) {
      const nameRegex = /([A-Z][a-z]+ova?\s+[A-Z][a-z]+\s+[A-Z][a-z]+ovna?)/;
      const nameMatch = text.match(nameRegex);
      if (nameMatch) {
        data.student_name = nameMatch[1];
        console.log(`Extracted student name: ${data.student_name}`);
      }
    }

    return { ...data, rawText: text };
  } catch (error) {
    console.error("Error extracting translated document:", error);
    return { error: error.message, rawText: "" };
  }
}

// Validate passport data
function validatePassportData(data) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Check required fields
  const requiredFields = [
    "passportNumber",
    "fullName",
    "dateOfBirth",
    "nationality",
    "gender",
  ];

  for (const field of requiredFields) {
    if (!data[field] || data[field].toString().trim() === "") {
      validation.errors.push(`Missing required field: ${field}`);
      validation.isValid = false;
    }
  }

  // Validate passport number format
  if (data.passportNumber && !/^[A-Z0-9]{6,12}$/.test(data.passportNumber)) {
    validation.warnings.push("Passport number format may be incorrect");
  }

  // Validate gender
  if (data.gender && !["M", "F", "X"].includes(data.gender)) {
    validation.warnings.push("Gender should be M, F, or X");
  }

  // Validate dates
  if (
    data.dateOfBirth &&
    !moment(data.dateOfBirth, "YYYY-MM-DD", true).isValid()
  ) {
    validation.warnings.push("Date of birth format may be incorrect");
  }

  if (
    data.expiryDate &&
    !moment(data.expiryDate, "YYYY-MM-DD", true).isValid()
  ) {
    validation.warnings.push("Expiry date format may be incorrect");
  }

  // Check if passport is expired
  if (data.expiryDate && moment(data.expiryDate).isBefore(moment())) {
    validation.warnings.push("Passport appears to be expired");
  }

  return validation;
}

// Enhanced comparison function with better name matching
function compareField(passportField, translatedField, fieldType = "text") {
  if (!passportField || !translatedField) {
    return {
      status: "missing",
      score: 0,
      details: "One or both fields are missing",
    };
  }

  const passport = passportField.toString().toLowerCase().trim();
  const translated = translatedField.toString().toLowerCase().trim();

  if (passport === translated) {
    return { status: "exact_match", score: 100, details: "Perfect match" };
  }

  // Special handling for dates
  if (fieldType === "date") {
    return compareDates(passport, translated);
  }

  // Special handling for names - normalize and compare components
  if (fieldType === "name" || fieldType === "text") {
    return compareNames(passport, translated);
  }

  // Use our similarity function for other fields
  const similarity = calculateSimilarity(passport, translated);
  const score = Math.round(similarity * 100);

  if (score === 100)
    return {
      status: "exact_match",
      score,
      details: "Perfect match after normalization",
    };
  else if (score >= 90)
    return {
      status: "very_close_match",
      score,
      details: "Very high similarity",
    };
  else if (score >= 80)
    return { status: "close_match", score, details: "High similarity" };
  else if (score >= 65)
    return { status: "partial_match", score, details: "Partial similarity" };
  else
    return {
      status: "mismatch",
      score,
      details: "Low similarity - possible different values",
    };
}

// Enhanced name comparison function
function compareNames(passportName, translatedName) {
  // Normalize names - remove extra spaces, convert to lowercase
  const normalizeNamePart = (name) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();
  };

  const passport = normalizeNamePart(passportName);
  const translated = normalizeNamePart(translatedName);

  // Direct comparison first
  if (passport === translated) {
    return { status: "exact_match", score: 100, details: "Perfect match" };
  }

  // Split names into components
  const passportParts = passport.split(" ").filter((part) => part.length > 0);
  const translatedParts = translated
    .split(" ")
    .filter((part) => part.length > 0);

  // Check if all components of one name are contained in the other
  let matchingParts = 0;
  let totalParts = Math.max(passportParts.length, translatedParts.length);

  for (const pPart of passportParts) {
    for (const tPart of translatedParts) {
      // Check for exact matches or high similarity
      const partSimilarity = calculateSimilarity(pPart, tPart);
      if (partSimilarity >= 0.8) {
        // 80% similarity for individual name parts
        matchingParts++;
        break;
      }
    }
  }

  // Also check reverse - translated parts in passport parts
  for (const tPart of translatedParts) {
    let found = false;
    for (const pPart of passportParts) {
      const partSimilarity = calculateSimilarity(pPart, tPart);
      if (partSimilarity >= 0.8) {
        found = true;
        break;
      }
    }
    if (found && matchingParts < totalParts) {
      // Don't double count, but ensure we capture all matches
    }
  }

  const score = Math.round((matchingParts / totalParts) * 100);

  // Special handling for common name patterns
  // Example: "RAYYONAZOKIROVNA ABDUKODIROVA" vs "Abdukodirova Rayyona Zokirovna"
  if (score < 70) {
    // Check if the core names match (ignore patronymic variations)
    const corePassportNames = passportParts.filter(
      (part) =>
        !part.includes("ovna") && !part.includes("ovich") && part.length > 3
    );
    const coreTranslatedNames = translatedParts.filter(
      (part) =>
        !part.includes("ovna") && !part.includes("ovich") && part.length > 3
    );

    let coreMatches = 0;
    for (const corePart of corePassportNames) {
      for (const translatedCore of coreTranslatedNames) {
        if (calculateSimilarity(corePart, translatedCore) >= 0.7) {
          coreMatches++;
          break;
        }
      }
    }

    if (
      coreMatches >=
        Math.min(corePassportNames.length, coreTranslatedNames.length) &&
      coreMatches > 0
    ) {
      return {
        status: "close_match",
        score: 75 + coreMatches * 5,
        details: `Core names match: ${coreMatches} of ${Math.max(
          corePassportNames.length,
          coreTranslatedNames.length
        )} parts`,
      };
    }
  }

  if (score === 100)
    return { status: "exact_match", score, details: "Perfect name match" };
  else if (score >= 90)
    return {
      status: "very_close_match",
      score,
      details: "Very high name similarity",
    };
  else if (score >= 75)
    return { status: "close_match", score, details: "High name similarity" };
  else if (score >= 50)
    return {
      status: "partial_match",
      score,
      details: "Partial name similarity",
    };
  else return { status: "mismatch", score, details: "Low name similarity" };
}

// Compare dates with flexible formatting
function compareDates(date1, date2) {
  // Clean up date strings
  const cleanDate = (dateStr) => {
    return dateStr
      .replace(/[^\w\s\-\/\,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const clean1 = cleanDate(date1);
  const clean2 = cleanDate(date2);

  const formats = [
    "YYYY-MM-DD",
    "DD/MM/YYYY",
    "MM/DD/YYYY",
    "DD-MM-YYYY",
    "YYYY/MM/DD",
    "MMM DD, YYYY",
    "MMMM DD, YYYY",
    "DD MMM YYYY",
    "DD MMMM YYYY",
  ];

  let moment1, moment2;

  // Try to parse both dates with different formats
  for (const format of formats) {
    if (!moment1 || !moment1.isValid()) {
      moment1 = moment(clean1, format, true);
    }
    if (!moment2 || !moment2.isValid()) {
      moment2 = moment(clean2, format, true);
    }
    if (moment1.isValid() && moment2.isValid()) break;
  }

  // Special handling for written dates like "May 06, 2007 (two thousand and seven)"
  if (!moment1.isValid() || !moment2.isValid()) {
    // Extract basic date patterns
    const datePattern1 = clean1.match(
      /(\d{1,2})[\s\-\/](\d{1,2})[\s\-\/](\d{4})/
    );
    const datePattern2 = clean2.match(
      /(\d{1,2})[\s\-\/](\d{1,2})[\s\-\/](\d{4})/
    );

    if (datePattern1) {
      moment1 = moment(
        `${datePattern1[3]}-${datePattern1[2].padStart(
          2,
          "0"
        )}-${datePattern1[1].padStart(2, "0")}`
      );
    }
    if (datePattern2) {
      moment2 = moment(
        `${datePattern2[3]}-${datePattern2[2].padStart(
          2,
          "0"
        )}-${datePattern2[1].padStart(2, "0")}`
      );
    }

    // Try parsing month names
    if (!moment1.isValid()) {
      const monthMatch1 = clean1.match(
        /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s+(\d{4})/i
      );
      if (monthMatch1) {
        moment1 = moment(
          `${monthMatch1[1]} ${monthMatch1[2]}, ${monthMatch1[3]}`,
          "MMMM DD, YYYY",
          true
        );
        if (!moment1.isValid()) {
          moment1 = moment(
            `${monthMatch1[1]} ${monthMatch1[2]}, ${monthMatch1[3]}`,
            "MMM DD, YYYY",
            true
          );
        }
      }
    }

    if (!moment2.isValid()) {
      const monthMatch2 = clean2.match(
        /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s+(\d{4})/i
      );
      if (monthMatch2) {
        moment2 = moment(
          `${monthMatch2[1]} ${monthMatch2[2]}, ${monthMatch2[3]}`,
          "MMMM DD, YYYY",
          true
        );
        if (!moment2.isValid()) {
          moment2 = moment(
            `${monthMatch2[1]} ${monthMatch2[2]}, ${monthMatch2[3]}`,
            "MMM DD, YYYY",
            true
          );
        }
      }
    }
  }

  if (!moment1.isValid() || !moment2.isValid()) {
    console.log(
      `Date parsing failed: "${clean1}" -> ${moment1?.isValid()}, "${clean2}" -> ${moment2?.isValid()}`
    );
    return {
      status: "invalid_date",
      score: 0,
      details: `Cannot parse dates: "${clean1}" and "${clean2}"`,
    };
  }

  if (moment1.isSame(moment2)) {
    return {
      status: "exact_match",
      score: 100,
      details: "Dates match exactly",
    };
  }

  return {
    status: "mismatch",
    score: 0,
    details: `Dates do not match: ${moment1.format(
      "YYYY-MM-DD"
    )} vs ${moment2.format("YYYY-MM-DD")}`,
  };
}

// Main endpoint with debugging
app.post("/check-docs", async (req, res) => {
  try {
    console.log("=== Starting document check ===");

    // Validate files
    if (!req.files) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    console.log("Uploaded files:", Object.keys(req.files));

    const {
      father_passport,
      mother_passport,
      student_passport,
      translated_doc,
    } = req.files;

    if (!student_passport || !translated_doc) {
      return res
        .status(400)
        .json({
          error: "Student passport and translated document are required",
        });
    }

    // Process all files
    console.log("Processing student passport...");
    const studentData = await extractPassport(student_passport);
    console.log("Student data:", studentData);

    console.log("Processing translated document...");
    const translatedData = await extractTranslatedDoc(translated_doc);
    console.log("Translated data:", translatedData);

    let fatherData = null;
    let motherData = null;

    if (father_passport) {
      console.log("Processing father passport...");
      fatherData = await extractPassport(father_passport);
      console.log("Father data:", fatherData);
    }

    if (mother_passport) {
      console.log("Processing mother passport...");
      motherData = await extractPassport(mother_passport);
      console.log("Mother data:", motherData);
    }

    // Build result
    const result = {
      timestamp: new Date().toISOString(),
      summary: {
        total_checks: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
      },
      student: {
        passport_data: {
          passport_number: studentData.passportNumber || "Not found",
          full_name: studentData.fullName || "Not found",
          given_names: studentData.givenNames || "Not found",
          surname: studentData.surname || "Not found",
          date_of_birth: studentData.dateOfBirth || "Not found",
          place_of_birth: studentData.placeOfBirth || "Not found",
          nationality: studentData.nationality || "Not found",
          gender: studentData.gender || "Not found",
          document_type: studentData.documentType || "Not found",
          issuing_country: studentData.issuingCountry || "Not found",
          issuing_authority: studentData.issuingAuthority || "Not found",
          issue_date: studentData.issueDate || "Not found",
          expiry_date: studentData.expiryDate || "Not found",
          validation: studentData.validation || {},
          extraction_method: studentData.extractionMethod || "mrz",
        },
        comparisons: {
          name: compareField(
            studentData.fullName,
            translatedData.student_name,
            "name"
          ),
          date_of_birth: compareField(
            studentData.dateOfBirth,
            translatedData.dob,
            "date"
          ),
          place_of_birth: compareField(
            studentData.placeOfBirth,
            translatedData.place_of_birth
          ),
          nationality: compareField(
            studentData.nationality,
            translatedData.nationality
          ),
        },
      },
    };

    // Add parent data if available
    if (fatherData && translatedData.father_name) {
      result.father = {
        passport_data: {
          passport_number: fatherData.passportNumber || "Not found",
          full_name: fatherData.fullName || "Not found",
          date_of_birth: fatherData.dateOfBirth || "Not found",
          nationality: fatherData.nationality || "Not found",
          validation: fatherData.validation || {},
          extraction_method: fatherData.extractionMethod || "mrz",
        },
        comparisons: {
          name: compareField(
            fatherData.fullName,
            translatedData.father_name,
            "name"
          ),
        },
      };
    }

    if (motherData && translatedData.mother_name) {
      result.mother = {
        passport_data: {
          passport_number: motherData.passportNumber || "Not found",
          full_name: motherData.fullName || "Not found",
          date_of_birth: motherData.dateOfBirth || "Not found",
          nationality: motherData.nationality || "Not found",
          validation: motherData.validation || {},
          extraction_method: motherData.extractionMethod || "mrz",
        },
        comparisons: {
          name: compareField(
            motherData.fullName,
            translatedData.mother_name,
            "name"
          ),
        },
      };
    }

    // Add translated document data
    result.translated_document = translatedData;

    // Calculate summary
    const allComparisons = [];
    if (result.student.comparisons) {
      allComparisons.push(...Object.values(result.student.comparisons));
    }
    if (result.father?.comparisons) {
      allComparisons.push(...Object.values(result.father.comparisons));
    }
    if (result.mother?.comparisons) {
      allComparisons.push(...Object.values(result.mother.comparisons));
    }

    result.summary.total_checks = allComparisons.length;
    result.summary.passed = allComparisons.filter((c) =>
      c.status.includes("match")
    ).length;
    result.summary.failed = allComparisons.filter(
      (c) => c.status === "mismatch"
    ).length;
    result.summary.warnings = allComparisons.filter(
      (c) => c.status === "missing"
    ).length;

    console.log("=== Document check completed ===");
    res.json(result);
  } catch (error) {
    console.error("Error in /check-docs:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "2.1.0",
  });
});

// Debug endpoint to test OCR on a single file
app.post("/debug-ocr", async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const file = req.files.image;
    const buffer = file.data;

    console.log(
      `Debug OCR for file: ${file.name}, size: ${buffer.length} bytes`
    );

    const {
      data: { text },
    } = await Tesseract.recognize(buffer, "eng", {
      logger: (m) => console.log(m),
    });

    res.json({
      filename: file.name,
      size: buffer.length,
      extracted_text: text,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in debug OCR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(
    `Enhanced Passport Verification Server running on http://localhost:${PORT}`
  );
  console.log("Endpoints:");
  console.log("  POST /check-docs  - Main verification endpoint");
  console.log("  POST /debug-ocr   - Debug OCR extraction");
  console.log("  GET  /health      - Health check");
});
