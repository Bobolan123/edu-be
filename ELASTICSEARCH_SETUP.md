# Elasticsearch Integration for Course Search

This document explains how to set up and use Elasticsearch for advanced course search functionality.

## Features

- **Full-text search** with fuzzy matching and typo tolerance
- **Autocomplete** functionality for course titles
- **Multi-field search** across title, description, instructor name, and categories
- **Advanced filtering** by price range, rating, category, language, and level
- **Faceted search** with aggregations for categories, price ranges, languages, and levels
- **Relevance scoring** with customizable field boosting
- **Real-time sync** between PostgreSQL and Elasticsearch via event listeners
- **Hybrid search capability** - combines with existing Qdrant semantic search

## Architecture

```
PostgreSQL (Source of Truth)
    ↓ (Event Emitters)
Elasticsearch (Search Index)
    ↓ (Search Queries)
API Responses
```

### Components

1. **ElasticsearchModule** - Main module for Elasticsearch integration
2. **ElasticsearchService** - Core service for ES operations (CRUD, search)
3. **CourseIndexingService** - Handles PostgreSQL ↔ Elasticsearch sync
4. **CourseService** - Updated to support ES search alongside traditional queries

## Setup

### 1. Start Elasticsearch with Docker

```bash
# Start all services including Elasticsearch and Kibana
docker-compose up -d

# Verify Elasticsearch is running
curl http://localhost:9200

# Access Kibana (optional, for visualization)
# Open http://localhost:5601 in your browser
```

**Services:**
- Elasticsearch: `http://localhost:9200`
- Kibana: `http://localhost:5601`

### 2. Environment Variables

The following variables are already configured in `.env`:

```env
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX_COURSES=courses
```

### 3. Initialize the Index

The index is automatically created on application startup, but you can also create it manually:

```bash
# Just start your NestJS application
npm run start:dev
```

The `ElasticsearchService.onModuleInit()` will:
- Check Elasticsearch connection
- Create the `courses` index if it doesn't exist
- Set up mappings and analyzers

### 4. Index Existing Courses

After starting the application, index all existing courses from PostgreSQL:

```bash
# Index courses (append to existing index)
npm run index:elasticsearch

# OR reindex (delete and recreate index, then index all courses)
npm run reindex:elasticsearch
```

**Expected output:**
```
🚀 Starting Elasticsearch course indexing...
📚 Fetching courses from database...
✅ Found 50 courses to index
📤 Indexing batch 1/1 (50 courses)
✅ Indexed 50/50 courses
🎉 Successfully indexed all courses!
```

## Usage

### API Endpoints

All existing course search endpoints now support Elasticsearch:

#### Basic Search

```bash
GET /courses?search=javascript&useElasticsearch=true
```

#### Search with Filters

```bash
GET /courses?search=react
  &categoryIds[]=1
  &minPrice=0
  &maxPrice=100
  &minRating=4
  &language=English
  &level=Beginner
  &useElasticsearch=true
```

#### Search with Aggregations (Faceted Search)

```bash
GET /courses?search=programming
  &useElasticsearch=true
  &includeAggregations=true
```

**Response includes:**
```json
{
  "result": [...],
  "meta": {...},
  "aggregations": {
    "categories": [
      { "key": "Programming", "count": 25 },
      { "key": "Web Development", "count": 15 }
    ],
    "priceRanges": [
      { "key": "free", "count": 10, "to": 1 },
      { "key": "budget", "count": 20, "from": 1, "to": 50 }
    ],
    "languages": [
      { "key": "English", "count": 40 },
      { "key": "Spanish", "count": 5 }
    ],
    "levels": [
      { "key": "Beginner", "count": 15 },
      { "key": "Intermediate", "count": 20 }
    ],
    "averagePrice": 45.99
  }
}
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search query (title, description, instructor, categories) |
| `useElasticsearch` | boolean | Enable Elasticsearch (default: `true`) |
| `includeAggregations` | boolean | Include faceted search data (default: `false`) |
| `categoryIds[]` | number[] | Filter by category IDs |
| `instructorId` | number | Filter by instructor ID |
| `minPrice` | number | Minimum price filter |
| `maxPrice` | number | Maximum price filter |
| `minRating` | number | Minimum rating (0-5) |
| `maxRating` | number | Maximum rating (0-5) |
| `language` | string | Filter by language |
| `level` | string | Filter by difficulty level |
| `status` | boolean | Filter by active status |
| `orderBy` | string | Sort field (default: `_score` for relevance) |
| `order` | ASC\|DESC | Sort order |
| `page` | number | Page number (default: 1) |
| `take` | number | Items per page (default: 10, max: 100) |

### Fallback to PostgreSQL

If `useElasticsearch=false` or no `search` query is provided, the system falls back to traditional PostgreSQL ILIKE queries.

## Auto-Sync with PostgreSQL

The system automatically syncs changes to Elasticsearch when courses are modified:

### Event Listeners

The `CourseIndexingService` listens to these events:

1. **course.created** - Indexes new courses
2. **course.updated** - Updates existing course documents
3. **course.deleted** - Removes courses from index (soft delete)
4. **course.restored** - Re-indexes restored courses

### Emitted in CourseService:

- `create()` → emits `course.created`
- `update()` → emits `course.updated`
- `remove()` → emits `course.deleted`
- `restore()` → emits `course.restored`
- `forceRemove()` → emits `course.deleted`

**No manual intervention required** - just use the standard CRUD operations!

## Index Mapping

### Analyzers

1. **course_analyzer** - Standard text analysis with stemming and stopwords
2. **autocomplete_analyzer** - Edge n-gram for autocomplete (2-20 chars)
3. **autocomplete_search_analyzer** - Standard analyzer for autocomplete search

### Fields

```javascript
{
  id: integer,
  title: text (with keyword + autocomplete),
  description: text,
  language: keyword,
  price: float,
  isActive: boolean,
  average_rating: float,
  total_reviews: integer,
  date_created: date,
  last_updated: date,

  instructor: {
    id: integer,
    name: text (with keyword),
    email: keyword
  },

  categories: [nested] {
    id: integer,
    name: text (with keyword),
    code: keyword
  },

  metadata: {
    language: keyword,
    level: keyword,
    whatYoullLearn: text[]
  },

  // Computed fields
  sections_count: integer,
  lectures_count: integer,
  total_duration_seconds: integer
}
```

## Search Features

### 1. Multi-field Search

Searches across multiple fields with different boosts:
- Title: **3x boost** (highest priority)
- Title autocomplete: **2x boost**
- Instructor name: **2x boost**
- Description: normal weight
- Categories: normal weight
- What you'll learn: normal weight

### 2. Fuzzy Matching

Automatically handles typos:
- "javascrpt" → finds "javascript"
- "reactjs" → finds "react"

### 3. Phrase Matching

Exact phrase matches score higher than individual word matches.

### 4. Nested Category Filtering

Efficiently filters by multiple category IDs using nested queries.

### 5. Range Queries

Price and rating ranges with inclusive/exclusive bounds.

## Kibana Dashboard (Optional)

Access Kibana at `http://localhost:5601` for:

1. **Dev Tools** - Test Elasticsearch queries
2. **Index Management** - View index statistics
3. **Discover** - Browse indexed documents
4. **Visualizations** - Create search analytics

### Example Query in Kibana

```json
GET /courses/_search
{
  "query": {
    "multi_match": {
      "query": "javascript",
      "fields": ["title^3", "description", "instructor.name^2"],
      "fuzziness": "AUTO"
    }
  }
}
```

## Troubleshooting

### Issue: Index not created

**Check Elasticsearch is running:**
```bash
curl http://localhost:9200/_cluster/health
```

**Manually create index:**
```bash
npm run reindex:elasticsearch
```

### Issue: Search returns no results

**Check if courses are indexed:**
```bash
curl http://localhost:9200/courses/_count
```

**Re-index all courses:**
```bash
npm run reindex:elasticsearch
```

### Issue: Sync not working

**Check event emitters:**
- Verify `EventEmitterModule` is imported in `AppModule`
- Check logs for "Event received: course.created" messages
- Ensure `CourseIndexingService` is properly injected

### Issue: Kibana not accessible

**Restart the service:**
```bash
docker-compose restart kibana
```

## Performance Considerations

1. **Batch Indexing** - Script indexes in batches of 50 for optimal performance
2. **Refresh Strategy** - Uses `refresh: 'wait_for'` to ensure data availability
3. **Minimal Replication** - Single-node setup uses 0 replicas
4. **Field Optimization** - Uses `keyword` for exact matches, `text` for full-text

## Hybrid Search (Future Enhancement)

You can combine Elasticsearch with Qdrant for hybrid search:

```javascript
// 1. Get keyword matches from Elasticsearch
const esResults = await elasticsearchService.searchCourses({...});

// 2. Get semantic matches from Qdrant
const qdrantResults = await qdrantService.search({...});

// 3. Merge and re-rank results
const hybridResults = mergeResults(esResults, qdrantResults);
```

## Maintenance

### Reindex Courses Periodically

If data becomes out of sync:

```bash
npm run reindex:elasticsearch
```

### Monitor Index Size

```bash
curl http://localhost:9200/courses/_stats?pretty
```

### Clear Old Data

```bash
# Delete the index
curl -X DELETE http://localhost:9200/courses

# Recreate and reindex
npm run reindex:elasticsearch
```

## Next Steps

1. **Add autocomplete endpoint** - Dedicated endpoint for autocomplete suggestions
2. **Search analytics** - Track search queries and popular terms
3. **Hybrid search** - Combine keyword (ES) + semantic (Qdrant) search
4. **Synonyms** - Add synonym mappings for better matches
5. **Multi-language support** - Language-specific analyzers

## Resources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [NestJS Elasticsearch](https://docs.nestjs.com/recipes/elasticsearch)
- [Kibana Guide](https://www.elastic.co/guide/en/kibana/current/index.html)
