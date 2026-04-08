# YouTube Multi-Channel Video Aggregator

This project automatically fetches and displays videos from multiple YouTube channels in one place.

## 📺 Supported Channels

1. **Furqan Qureshi** - Pakistani Drama
2. **Really Maktoob** - Entertainment
3. **Proboiz95** - Gaming/Tech
4. **Junkkey** - Entertainment
5. **Chai or Code** - Coding/Tech
6. **ZemTV** - News/Entertainment
7. **Quran DVD** - Religious

## 🚀 Setup Instructions

### Step 1: Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **YouTube Data API v3**
4. Create credentials (API Key)
5. Copy the API key

### Step 2: Configure Project

1. Open `.env` file
2. Replace `YOUR_YOUTUBE_API_KEY_HERE` with your actual API key:
   ```
   YOUTUBE_API_KEY=AIzaSyYourActualKeyHere
   ```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Run the Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### Step 5: Open in Browser

Visit: `http://localhost:3000`

## 📝 Features

- ✅ Automatic video fetching from 7 channels
- ✅ Search across all videos
- ✅ Filter by channel
- ✅ Pagination (15 videos per page)
- ✅ Video player with YouTube embed
- ✅ Dark/Light theme toggle
- ✅ Responsive design
- ✅ Real-time stats (total videos, channels, views)
- ✅ Manual refresh button
- ✅ Share video links
- ✅ Open videos in YouTube

## 🔄 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/videos` | GET | Get all videos (with pagination, search, filter) |
| `/api/channels` | GET | Get all channels |
| `/api/videos/:id` | GET | Get specific video |
| `/api/refresh` | POST | Manually refresh videos from YouTube |

## 📊 Query Parameters

### `/api/videos`
- `page` - Page number (default: 1)
- `limit` - Videos per page (default: 20)
- `channel` - Filter by channel name
- `search` - Search in titles and descriptions

Example:
```
/api/videos?page=1&limit=10&channel=Furqan%20Qureshi&search=drama
```

## 🛠️ Customization

### Add More Channels

Edit `server.js` and add to `CHANNEL_CONFIGS`:

```javascript
{
  name: 'Channel Name',
  searchQuery: 'YouTube Search Query',
  category: 'Category'
}
```

### Change Videos Per Page

In `public/index.html`, modify:
```javascript
const ITEMS_PER_PAGE = 15; // Change this number
```

## ⚠️ API Quota Limits

YouTube Data API has quota limits:
- Search: 100 units per request
- Channel details: 1 unit
- Playlist items: 1-2 units per video
- Video stats: 1 unit per video

**Free tier:** 10,000 units per day

The app fetches up to 100 videos per channel. If you have many channels, be mindful of quota usage.

## 📁 Project Structure

```
youtube/
├── server.js          # Backend server
├── package.json       # Dependencies
├── .env              # Configuration
├── .env.example      # Example config
├── README.md         # This file
└── public/
    └── index.html    # Frontend
```

## 🚨 Troubleshooting

### "No YouTube API key found"
- Make sure you created `.env` file
- Verify API key is correct
- Check if YouTube Data API is enabled in Google Console

### "Channel not found"
- Some channels might have different names on YouTube
- Try searching the exact channel name on YouTube first
- Update the `searchQuery` in `server.js`

### Videos not loading
- Check browser console for errors
- Verify API quota hasn't exceeded
- Try refreshing: Click the 🔄 button or restart server

### API Quota Exceeded
- Wait 24 hours for quota reset
- Reduce videos fetched per channel in `fetchChannelVideos()`
- Upgrade to paid tier in Google Cloud

## 💡 Tips

1. **Search exact channel names** on YouTube first
2. **Start with fewer videos** (change `maxResults` to 20)
3. **Use channel IDs directly** if you know them (faster and more accurate)
4. **Add channels gradually** to manage API quota

## 📞 Support

If you need help:
1. Check the console for error messages
2. Verify your API key is working
3. Make sure all 7 channels exist on YouTube

---

**Enjoy watching videos from all your favorite channels in one place! 🎉**
