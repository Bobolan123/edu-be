# RAG System Setup Guide

## Overview
Your NestJS application now has a complete **Retrieval-Augmented Generation (RAG)** system using Qdrant vector database and Google Gemini for course-specific chatbot functionality.

## Architecture

### Components Created
1. **QdrantModule** (`src/modules/qdrant/`)
   - `qdrant.service.ts` - Manages vector storage and retrieval
   - `qdrant.module.ts` - Module configuration

2. **Enhanced GeminiModule** (`src/modules/gemini/`)
   - `gemini.service.ts` - Added embedding generation and RAG pipeline
   - `gemini.controller.ts` - Updated to accept courseId
   - `dto/chat-request.dto.ts` - Request validation

3. **Ingestion Script** (`src/scripts/`)
   - `ingest-courses.ts` - Populates Qdrant with course content

### How It Works
1. User sends a question with a `courseId`
2. System generates embedding from the question
3. Qdrant searches for relevant content **filtered by courseId**
4. Retrieved context is injected into Gemini prompt
5. Gemini generates answer based on course-specific context

## Setup Instructions

### 1. Install Qdrant
**Option A: Docker (Recommended)**
```bash
docker run -p 6333:6333 qdrant/qdrant
```

**Option B: Cloud**
- Sign up at https://cloud.qdrant.io
- Create a cluster and get your URL + API key

### 2. Environment Variables
Add to your `.env` file:
```env
# Qdrant Configuration
QDRANT_URL=http://localhost:6333
#Optional for local, required for cloud
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.kFLpYkH9Ilo19ap_lBpvev85Dh-VVa9V6ycHwazYKjU 
QDRANT_COLLECTION_NAME=course_lectures

# Gemini API (already configured)
GEMINI_API_KEY=your_existing_key
```

### 3. Run Course Ingestion
Populate Qdrant with your course data:
```bash
npm run ingest:courses
```

This script will:
- Connect to PostgreSQL
- Fetch all courses with sections and lectures
- Extract text from:
  - Course title, description, learning objectives
  - Section titles and descriptions
  - Lecture titles and descriptions
  - Quiz questions, options, and explanations
- Generate embeddings using Gemini
- Store in Qdrant with courseId metadata

### 4. Test the RAG Endpoint

**Endpoint:** `POST /gemini/chat`

**Request Body:**
```json
{
  "prompt": "What topics are covered in this course?",
  "courseId": 1
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Gemini response",
  "data": {
    "answer": "Based on the course materials...",
    "sources": [
      {
        "lectureId": "uuid-123",
        "title": "Introduction to Variables",
        "score": 0.92
      }
    ]
  }
}
```

## Content Extraction Strategy

### Video Lectures
- **Extracted:** Title + Description
- **Limitation:** No video transcript (only topic info)

### Quiz Lectures
- **Extracted:** Title + Description + Questions + Options + Explanations
- **Rich Context:** Best source for detailed Q&A

### Course Level
- **Extracted:** Title + Description + Learning Objectives

## Usage Tips

### For Best Results
1. **Ensure detailed descriptions** for video lectures (since no transcript)
2. **Quiz content provides the richest context** - use for key concepts
3. **Course descriptions** help with overview questions

### Adjusting RAG Parameters
Edit `gemini.service.ts:40` to change:
- `limit: 5` - Number of context chunks retrieved (default: 5)
- Higher = more context but longer prompts

### Similarity Threshold
Currently returns top-k results. To add minimum score threshold:
```typescript
const filteredResults = searchResults.filter(r => r.score > 0.7);
```

## Re-ingestion
When course content changes:
```bash
npm run ingest:courses
```
- Updates existing lectures (by ID)
- Adds new lectures
- Keeps old data unless overwritten

## Troubleshooting

### "Collection not found" error
- Ensure Qdrant is running: `docker ps`
- Check `QDRANT_URL` in `.env`
- Collection auto-creates on first ingestion

### No relevant context returned
- Verify ingestion completed successfully
- Check courseId matches database
- Ensure embeddings were generated (check logs)

### Rate limiting (Gemini API)
- Ingestion processes all lectures sequentially
- For large courses, add delays:
  ```typescript
  await new Promise(resolve => setTimeout(resolve, 100));
  ```

## Next Steps

### Optional Enhancements
1. **Add video transcripts** to `VideoContent` interface
2. **Implement caching** for frequently asked questions
3. **Add conversation history** for follow-up questions
4. **Tune similarity threshold** based on testing
5. **Implement incremental ingestion** (only new/updated content)

## Files Modified/Created

### Created
- `src/modules/qdrant/qdrant.service.ts`
- `src/modules/qdrant/qdrant.module.ts`
- `src/modules/gemini/dto/chat-request.dto.ts`
- `src/scripts/ingest-courses.ts`
- `package.json` - Added ingestion script

### Modified
- `src/modules/gemini/gemini.service.ts` - Added RAG pipeline
- `src/modules/gemini/gemini.controller.ts` - Added courseId param
- `src/modules/gemini/gemini.module.ts` - Import QdrantModule

---

**Your RAG system is ready! 🚀**
