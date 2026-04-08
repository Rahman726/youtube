#!/usr/bin/env node

/**
 * Standalone script to fetch YouTube videos
 * Run: node scripts/fetchVideos.js
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

// Channel configurations
const CHANNEL_CONFIGS = [
  { name: 'Furqan Qureshi', searchQuery: 'Furqan Qureshi' },
  { name: 'Really Maktoob', searchQuery: 'Really Maktoob' },
  { name: 'Proboiz95', searchQuery: 'Proboiz95' },
  { name: 'Junkkey', searchQuery: 'Junkkey' },
  { name: 'Chai or Code', searchQuery: 'Chai or Code' },
  { name: 'ZemTV', searchQuery: 'ZemTV' },
  { name: 'Quran DVD', searchQuery: 'Quran DVD' }
];

// Search for channel
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
      return {
        id: response.data.items[0].id.channelId,
        title: response.data.items[0].snippet.title
      };
    }
    return null;
  } catch (error) {
    console.error(`❌ Error searching ${channelName}:`, error.message);
    return null;
  }
}

// Fetch videos from channel
async function fetchChannelVideos(channelId, channelName, maxResults = 50) {
  const videos = [];
  let pageToken = null;
  
  try {
    // Get upload playlist
    const channelRes = await axios.get(`${YOUTUBE_API_URL}/channels`, {
      params: {
        part: 'contentDetails',
        id: channelId,
        key: YOUTUBE_API_KEY
      }
    });
    
    const uploadsPlaylistId = channelRes.data.items[0].contentDetails.relatedPlaylists.uploads;
    
    // Fetch videos
    do {
      const params = {
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: 50,
        key: YOUTUBE_API_KEY
      };
      
      if (pageToken) params.pageToken = pageToken;
      
      const response = await axios.get(`${YOUTUBE_API_URL}/playlistItems`, { params });
      
      if (response.data.items) {
        for (const item of response.data.items) {
          const videoId = item.contentDetails.videoId || item.snippet.resourceId?.videoId;
          if (videoId) {
            videos.push({
              id: videoId,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
              publishedAt: item.snippet.publishedAt,
              channelName: channelName,
              url: `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`,
              duration: item.contentDetails.duration || 'N/A'
            });
          }
        }
      }
      
      pageToken = response.data.nextPageToken;
      
      if (videos.length >= maxResults) break;
      
    } while (pageToken);
    
    return videos;
  } catch (error) {
    console.error(`❌ Error fetching videos for ${channelName}:`, error.message);
    return [];
  }
}

// Fetch video statistics
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
          likes: item.statistics.likeCount || '0'
        };
      });
    }
    return statsMap;
  } catch (error) {
    console.error('❌ Error fetching stats:', error.message);
    return {};
  }
}

// Format numbers
function formatNumber(num) {
  if (!num) return '0';
  const n = parseInt(num);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

// Main function
async function main() {
  console.log('🎬 YouTube Video Fetcher\n');
  
  if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
    console.error('❌ Please set your YouTube API key in .env file');
    process.exit(1);
  }
  
  const allVideos = [];
  const channels = [];
  
  for (const config of CHANNEL_CONFIGS) {
    console.log(`🔍 Searching: ${config.name}`);
    
    const channel = await searchChannel(config.searchQuery);
    
    if (channel) {
      console.log(`  ✅ Found: ${channel.title}`);
      channels.push(channel);
      
      console.log(`  📥 Fetching videos...`);
      const videos = await fetchChannelVideos(channel.id, channel.title, 50);
      
      // Fetch stats
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
      allVideos.push(...videos);
      
      // Delay to respect rate limits
      await new Promise(r => setTimeout(r, 1000));
    } else {
      console.log(`  ❌ Not found\n`);
    }
  }
  
  // Sort by date
  allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  // Save to JSON
  const dataDir = path.join(__dirname, '..', 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (e) {
    // Directory exists
  }
  
  await fs.writeFile(
    path.join(dataDir, 'videos.json'),
    JSON.stringify({ videos: allVideos, channels, lastUpdated: new Date().toISOString() }, null, 2)
  );
  
  console.log('💾 Saved to data/videos.json\n');
  console.log(`📊 Summary:`);
  console.log(`  Total Channels: ${channels.length}`);
  console.log(`  Total Videos: ${allVideos.length}`);
  console.log(`  Last Updated: ${new Date().toLocaleString()}`);
  console.log('\n✅ Done!\n');
}

main().catch(console.error);
