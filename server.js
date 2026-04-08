const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store videos in memory (you can use a database in production)
let allVideos = [];
let channels = [];

// Channel configurations - You can search by username or use direct channel IDs
const CHANNEL_CONFIGS = [
  {
    name: 'Furqan Qureshi',
    searchQuery: 'Furqan Qureshi',
    username: null,
    category: 'Drama'
  },
  {
    name: 'Really Maktoob',
    searchQuery: 'Really Maktoob',
    username: null,
    category: 'Entertainment'
  },
  {
    name: 'Proboiz95',
    searchQuery: 'Proboiz95',
    username: null,
    category: 'Gaming/Tech'
  },
  {
    name: 'Junkkey',
    searchQuery: 'Junkkey',
    username: null,
    category: 'Entertainment'
  },
  {
    name: 'Chai or Code',
    searchQuery: 'Chai or Code',
    username: null,
    category: 'Coding/Tech'
  },
  {
    name: 'ZemTV',
    searchQuery: 'ZemTV',
    username: null,
    category: 'News/Entertainment'
  },
  {
    name: 'Quran DVD',
    searchQuery: 'Quran DVD',
    username: null,
    category: 'Religious'
  }
];

// YouTube API Base URL
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

// Search for channel by name
async function searchChannel(channelName) {
  try {
    const response = await axios.get(`${YOUTUBE_API_URL}/search`, {
      params: {
        part: 'snippet',
        q: channelName,
        type: 'channel',
        maxResults: 1,
        key: YOUTUBE_API_KEY
      }
    });
    
    if (response.data.items && response.data.items.length > 0) {
      const channel = response.data.items[0];
      return {
        id: channel.id.channelId,
        title: channel.snippet.title,
        description: channel.snippet.description,
        thumbnail: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url,
        publishedAt: channel.snippet.publishedAt
      };
    }
    return null;
  } catch (error) {
    console.error(`Error searching channel ${channelName}:`, error.message);
    return null;
  }
}

// Fetch all videos from a channel
async function fetchChannelVideos(channelId, channelName, maxResults = 50) {
  const videos = [];
  let pageToken = null;
  
  try {
    // Get upload playlist ID for the channel
    const channelResponse = await axios.get(`${YOUTUBE_API_URL}/channels`, {
      params: {
        part: 'contentDetails',
        id: channelId,
        key: YOUTUBE_API_KEY
      }
    });
    
    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      console.log(`No channel found for ID: ${channelId}`);
      return videos;
    }
    
    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;
    
    // Fetch videos from uploads playlist
    do {
      const params = {
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: Math.min(maxResults, 50),
        key: YOUTUBE_API_KEY
      };
      
      if (pageToken) {
        params.pageToken = pageToken;
      }
      
      const response = await axios.get(`${YOUTUBE_API_URL}/playlistItems`, { params });
      
      if (response.data.items) {
        for (const item of response.data.items) {
          const videoId = item.contentDetails.videoId || item.snippet.resourceId?.videoId;
          if (videoId) {
            videos.push({
              id: videoId,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnail: item.snippet.thumbnails.high?.url || 
                        item.snippet.thumbnails.medium?.url || 
                        item.snippet.thumbnails.default?.url,
              publishedAt: item.snippet.publishedAt,
              channelName: channelName,
              url: `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`,
              duration: item.contentDetails.duration || 'N/A'
            });
          }
        }
      }
      
      pageToken = response.data.nextPageToken;
      
      // Limit to avoid hitting API quota too fast
      if (videos.length >= maxResults) {
        break;
      }
      
    } while (pageToken);
    
    return videos;
    
  } catch (error) {
    console.error(`Error fetching videos for channel ${channelName}:`, error.message);
    return videos;
  }
}

// Fetch video statistics (views, likes)
async function fetchVideoStats(videoIds) {
  try {
    const response = await axios.get(`${YOUTUBE_API_URL}/videos`, {
      params: {
        part: 'statistics',
        id: videoIds.join(','),
        key: YOUTUBE_API_KEY
      }
    });
    
    const statsMap = {};
    if (response.data.items) {
      response.data.items.forEach(item => {
        statsMap[item.id] = {
          views: item.statistics.viewCount || '0',
          likes: item.statistics.likeCount || '0',
          comments: item.statistics.commentCount || '0'
        };
      });
    }
    return statsMap;
  } catch (error) {
    console.error('Error fetching video stats:', error.message);
    return {};
  }
}

// Fetch all videos from all channels
async function fetchAllVideos() {
  console.log('🚀 Starting to fetch videos from all channels...\n');
  
  allVideos = [];
  channels = [];
  
  for (const config of CHANNEL_CONFIGS) {
    console.log(`📺 Searching for channel: ${config.name}`);
    
    const channelInfo = await searchChannel(config.searchQuery);
    
    if (channelInfo) {
      console.log(`  ✅ Found: ${channelInfo.title}`);
      console.log(`  🆔 Channel ID: ${channelInfo.id}`);
      
      channels.push({
        ...channelInfo,
        category: config.category
      });
      
      console.log(`  📥 Fetching videos...`);
      const videos = await fetchChannelVideos(channelInfo.id, channelInfo.title, 100);
      
      // Fetch stats for these videos
      if (videos.length > 0) {
        const videoIds = videos.map(v => v.id);
        const stats = await fetchVideoStats(videoIds);
        
        videos.forEach(video => {
          if (stats[video.id]) {
            video.views = formatNumber(stats[video.id].views) + ' views';
            video.likes = formatNumber(stats[video.id].likes);
          }
        });
      }
      
      console.log(`  ✓ Fetched ${videos.length} videos\n`);
      allVideos = allVideos.concat(videos);
      
      // Delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log(`  ❌ Channel not found: ${config.name}\n`);
    }
  }
  
  // Sort by published date (newest first)
  allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  console.log(`\n🎉 Total videos fetched: ${allVideos.length}`);
  console.log('✅ Fetch complete!\n');
}

// Format numbers (e.g., 1500000 -> 1.5M)
function formatNumber(num) {
  if (!num) return '0';
  const n = parseInt(num);
  if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

// API Routes

// Get all videos
app.get('/api/videos', (req, res) => {
  const { channel, search, page = 1, limit = 20 } = req.query;
  
  let filteredVideos = [...allVideos];
  
  // Filter by channel
  if (channel) {
    filteredVideos = filteredVideos.filter(v => 
      v.channelName.toLowerCase().includes(channel.toLowerCase())
    );
  }
  
  // Search videos
  if (search) {
    filteredVideos = filteredVideos.filter(v => 
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedVideos = filteredVideos.slice(startIndex, endIndex);
  
  res.json({
    total: filteredVideos.length,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(filteredVideos.length / limit),
    videos: paginatedVideos
  });
});

// Get all channels
app.get('/api/channels', (req, res) => {
  res.json(channels);
});

// Get channel by ID with videos
app.get('/api/channels/:channelId/videos', async (req, res) => {
  const { channelId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  
  const channelVideos = allVideos.filter(v => v.channelId === channelId);
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  
  res.json({
    total: channelVideos.length,
    page: parseInt(page),
    limit: parseInt(limit),
    videos: channelVideos.slice(startIndex, endIndex)
  });
});

// Refresh videos (manual trigger)
app.post('/api/refresh', async (req, res) => {
  console.log('🔄 Manual refresh triggered');
  await fetchAllVideos();
  res.json({ 
    message: 'Videos refreshed successfully',
    totalVideos: allVideos.length,
    channels: channels.length
  });
});

// Get video by ID
app.get('/api/videos/:videoId', (req, res) => {
  const video = allVideos.find(v => v.id === req.params.videoId);
  if (video) {
    res.json(video);
  } else {
    res.status(404).json({ error: 'Video not found' });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize server
async function startServer() {
  // Fetch videos on startup
  if (YOUTUBE_API_KEY && YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_API_KEY_HERE') {
    await fetchAllVideos();
  } else {
    console.log('⚠️  No YouTube API key found. Please add your API key to .env file');
    console.log('   Get your API key from: https://console.cloud.google.com/apis/credentials');
  }
  
  app.listen(PORT, () => {
    console.log(`\n🌐 Server running at http://localhost:${PORT}`);
    console.log(`📊 API Endpoints:`);
    console.log(`   GET /api/videos - Get all videos`);
    console.log(`   GET /api/channels - Get all channels`);
    console.log(`   POST /api/refresh - Refresh videos from YouTube`);
    console.log(`\n💡 To refresh videos, visit: http://localhost:${PORT}/api/refresh (POST)`);
  });
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Server shutting down...');
  process.exit(0);
});
