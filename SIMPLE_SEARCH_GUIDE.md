# Simple Elasticsearch Search Guide

## What It Does

When users type in a search box, Elasticsearch returns the most relevant courses automatically.

## How It Works

```
User types "javascript" → Elasticsearch searches → Returns relevant courses (sorted by relevance)
```

## Setup (One Time)

### 1. Start Elasticsearch
```bash
docker-compose up -d
```

This starts:
- Elasticsearch on `http://localhost:9200`
- Kibana on `http://localhost:5601` (optional dashboard)

### 2. Start Your App
```bash
npm run start:dev
```

The index is created automatically on startup.

### 3. Index Your Existing Courses
```bash
npm run index:elasticsearch
```

This puts all your courses into Elasticsearch.

---

## Usage

### Simple Search (What You Want)

```bash
GET /courses?search=javascript
```

**What happens:**
1. User types "javascript"
2. Elasticsearch searches across:
   - Course title (most important)
   - Course description
   - Instructor name
   - Categories
3. Returns courses sorted by **relevance** (most matching first)

**Features:**
- ✅ Typo tolerance: "javascrpt" → finds "javascript"
- ✅ Partial matching: "java" → finds "javascript"
- ✅ Fuzzy search: "reactjs" → finds "react"
- ✅ Multi-word: "javascript beginner" → finds beginner JavaScript courses

### Search with Filters

```bash
GET /courses?search=react&categoryIds[]=1&minPrice=0&maxPrice=50
```

Combines text search with filters.

### No Search Query = PostgreSQL (Traditional)

```bash
GET /courses?categoryIds[]=1
```

If no search text, uses traditional PostgreSQL filtering.

---

## Auto-Sync

Courses are **automatically** synced to Elasticsearch when you:
- Create a course → Auto-indexed
- Update a course → Auto-updated
- Delete a course → Auto-removed
- Restore a course → Auto-re-indexed

**No manual work needed!**

---

## API Examples

### Frontend Search Input

```javascript
// User types in search box
<input
  type="text"
  onChange={(e) => searchCourses(e.target.value)}
/>

// API Call
async function searchCourses(searchText) {
  const response = await fetch(`/courses?search=${searchText}`);
  const data = await response.json();

  // data.result contains courses sorted by relevance
  // data.meta contains pagination info
  displayCourses(data.result);
}
```

### Response Format

```json
{
  "result": [
    {
      "id": 1,
      "title": "JavaScript Fundamentals",
      "description": "Learn JavaScript from scratch",
      "price": 49.99,
      "average_rating": 4.5,
      "instructor": {
        "id": 5,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "categories": [
        { "id": 1, "name": "Programming" }
      ]
    },
    ...
  ],
  "meta": {
    "page": 1,
    "take": 10,
    "itemCount": 150,
    "pageCount": 15,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

---

## Search Examples

| User Types | Finds |
|------------|-------|
| `javascript` | All JavaScript courses |
| `react` | React, ReactJS, React Native courses |
| `john doe` | Courses by instructor John Doe |
| `beginner python` | Beginner Python courses |
| `web development` | Web Development courses |

---

## Troubleshooting

### Search returns nothing

**Check if courses are indexed:**
```bash
curl http://localhost:9200/courses/_count
```

Should return: `{"count": 50, ...}` (or your course count)

**Re-index if needed:**
```bash
npm run reindex:elasticsearch
```

### Elasticsearch not running

**Check status:**
```bash
docker ps | grep elasticsearch
```

**Restart:**
```bash
docker-compose restart elasticsearch
```

---

## That's It!

Simple usage:
1. User types in search box
2. Call `GET /courses?search=query`
3. Get relevant results back

No complex setup, no aggregations, just simple search! 🎯
