const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { initDb } = require('./connection');
const queries = require('./queries');
const { processPostHashtags } = require('../services/hashtagService');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Generate stylish SVG avatars with gradients
function generateAvatarSvg(name, color1, color2) {
  const initials = name
    .split(' ')
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${color2}"/>
      </linearGradient>
    </defs>
    <circle cx="64" cy="64" r="64" fill="url(#grad)"/>
    <text x="64" y="74" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;
}

// Generate banner/cover images
function generateCoverSvg(color1, color2, _title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 240" width="800" height="240">
    <defs>
      <linearGradient id="cgrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${color2}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="240" fill="url(#cgrad)"/>
    <circle cx="700" cy="40" r="120" fill="#ffffff" fill-opacity="0.08"/>
    <circle cx="100" cy="200" r="90" fill="#ffffff" fill-opacity="0.06"/>
    <ellipse cx="400" cy="120" rx="280" ry="60" transform="rotate(-10 400 120)" stroke="#ffffff" stroke-opacity="0.15" stroke-width="2" fill="none"/>
  </svg>`;
}

async function seed() {
  console.log('🌱 Starting Orbitly database seeding...');
  const db = initDb();

  // Clean existing tables in proper order
  console.log('🧹 Purging existing data...');
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM post_hashtags;
    DELETE FROM hashtags;
    DELETE FROM comment_likes;
    DELETE FROM post_likes;
    DELETE FROM comments;
    DELETE FROM follows;
    DELETE FROM posts;
    DELETE FROM profiles;
    DELETE FROM users;
    DELETE FROM sessions;
  `);

  const passwordHash = await bcrypt.hash('demo1234', 12);

  // 1. Create 8 Demo Users
  const demoUsers = [
    {
      username: 'stella_nova',
      email: 'stella@orbitly.io',
      display_name: 'Stella Nova',
      bio: 'Astrophysicist & stargazer 🌌 Exploring cosmic frontiers. Always keeping my circle in orbit.',
      location: 'Geneva, Switzerland',
      website: 'https://stellanova.space',
      c1: '#7C3AED',
      c2: '#EC4899'
    },
    {
      username: 'leo_dev',
      email: 'leo@orbitly.io',
      display_name: 'Leo Chen',
      bio: 'Full-stack software engineer building sleek web experiences 💻 Node.js, SQLite & clean CSS enthusiast.',
      location: 'San Francisco, CA',
      website: 'https://leochen.dev',
      c1: '#3B82F6',
      c2: '#10B981'
    },
    {
      username: 'maya_design',
      email: 'maya@orbitly.io',
      display_name: 'Maya Patel',
      bio: 'Product designer & visual architect 🎨 Passionate about design systems, typography & micro-interactions.',
      location: 'London, UK',
      website: 'https://mayapatel.design',
      c1: '#F59E0B',
      c2: '#EF4444'
    },
    {
      username: 'orion_beats',
      email: 'orion@orbitly.io',
      display_name: 'Orion Blake',
      bio: 'Synthesizer wizard & electronic producer 🎧 Crafting atmospheric soundscapes that drift through orbit.',
      location: 'Berlin, Germany',
      website: 'https://orionbeats.fm',
      c1: '#8B5CF6',
      c2: '#06B6D4'
    },
    {
      username: 'elena_writes',
      email: 'elena@orbitly.io',
      display_name: 'Elena Rostova',
      bio: 'Sci-fi author & espresso fanatic ☕ Currently writing stories set beyond the Kuiper Belt.',
      location: 'Prague, Czechia',
      website: 'https://elenarostova.lit',
      c1: '#EC4899',
      c2: '#F97316'
    },
    {
      username: 'sam_ai',
      email: 'sam@orbitly.io',
      display_name: 'Dr. Sam Morales',
      bio: 'AI researcher & robotics explorer 🤖 Studying autonomous neural systems and human-machine interaction.',
      location: 'Boston, MA',
      website: 'https://sammorales.ai',
      c1: '#14B8A6',
      c2: '#3B82F6'
    },
    {
      username: 'clara_travels',
      email: 'clara@orbitly.io',
      display_name: 'Clara Santos',
      bio: 'Documentary photographer & digital nomad 📸 45 countries photographed and counting.',
      location: 'Kyoto, Japan',
      website: 'https://clarasantos.photo',
      c1: '#F43F5E',
      c2: '#FB923C'
    },
    {
      username: 'zane_crypto',
      email: 'zane@orbitly.io',
      display_name: 'Zane Vance',
      bio: 'Security researcher & open-source contributor 🛡️ Keeping digital systems resilient and decentralized.',
      location: 'Stockholm, Sweden',
      website: 'https://zanevance.security',
      c1: '#6366F1',
      c2: '#A855F7'
    }
  ];

  console.log('👤 Creating users and profiles...');
  const userMap = {};

  for (const u of demoUsers) {
    const avatarFilename = `avatar-${u.username}.svg`;
    const coverFilename = `cover-${u.username}.svg`;
    fs.writeFileSync(path.join(UPLOADS_DIR, avatarFilename), generateAvatarSvg(u.display_name, u.c1, u.c2));
    fs.writeFileSync(path.join(UPLOADS_DIR, coverFilename), generateCoverSvg(u.c1, u.c2, u.display_name));

    const userId = queries.createUser(db, {
      username: u.username,
      email: u.email,
      password_hash: passwordHash,
      display_name: u.display_name
    });

    queries.updateProfile(db, userId, {
      bio: u.bio,
      location: u.location,
      website: u.website,
      avatar_path: `/uploads/${avatarFilename}`,
      cover_path: `/uploads/${coverFilename}`
    });

    userMap[u.username] = userId;
  }

  // 2. Create Follow Network
  console.log('🤝 Building follow network...');
  const followPairs = [
    ['stella_nova', 'leo_dev'],
    ['stella_nova', 'maya_design'],
    ['stella_nova', 'sam_ai'],
    ['stella_nova', 'elena_writes'],
    ['leo_dev', 'stella_nova'],
    ['leo_dev', 'maya_design'],
    ['leo_dev', 'zane_crypto'],
    ['leo_dev', 'sam_ai'],
    ['maya_design', 'stella_nova'],
    ['maya_design', 'leo_dev'],
    ['maya_design', 'orion_beats'],
    ['maya_design', 'clara_travels'],
    ['orion_beats', 'stella_nova'],
    ['orion_beats', 'maya_design'],
    ['orion_beats', 'clara_travels'],
    ['elena_writes', 'stella_nova'],
    ['elena_writes', 'orion_beats'],
    ['elena_writes', 'sam_ai'],
    ['sam_ai', 'stella_nova'],
    ['sam_ai', 'leo_dev'],
    ['sam_ai', 'zane_crypto'],
    ['clara_travels', 'stella_nova'],
    ['clara_travels', 'maya_design'],
    ['clara_travels', 'orion_beats'],
    ['zane_crypto', 'leo_dev'],
    ['zane_crypto', 'sam_ai']
  ];

  for (const [follower, following] of followPairs) {
    queries.followUser(db, userMap[follower], userMap[following]);
  }

  // Generate a couple of demo post images
  const postImage1 = 'post-space.svg';
  const postImage2 = 'post-code.svg';
  fs.writeFileSync(
    path.join(UPLOADS_DIR, postImage1),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
      <defs>
        <radialGradient id="spacebg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="#1E1B4B"/>
          <stop offset="100%" stop-color="#0F0F1A"/>
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#spacebg)"/>
      <circle cx="400" cy="225" r="90" fill="#7C3AED"/>
      <ellipse cx="400" cy="225" rx="190" ry="50" transform="rotate(-20 400 225)" stroke="#EC4899" stroke-width="6" fill="none"/>
      <circle cx="560" cy="180" r="14" fill="#F472B6"/>
      <circle cx="200" cy="100" r="2" fill="#FFFFFF"/>
      <circle cx="650" cy="120" r="3" fill="#FFFFFF"/>
      <circle cx="320" cy="340" r="2.5" fill="#FFFFFF"/>
      <circle cx="620" cy="360" r="2" fill="#FFFFFF"/>
    </svg>`
  );

  fs.writeFileSync(
    path.join(UPLOADS_DIR, postImage2),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
      <rect width="800" height="450" fill="#0F172A"/>
      <rect x="50" y="50" width="700" height="350" rx="16" fill="#1E293B"/>
      <circle cx="85" cy="85" r="7" fill="#EF4444"/>
      <circle cx="110" cy="85" r="7" fill="#F59E0B"/>
      <circle cx="135" cy="85" r="7" fill="#10B981"/>
      <text x="85" y="150" font-family="monospace" font-size="20" fill="#38BDF8">const orbit = new Orbitly({</text>
      <text x="120" y="190" font-family="monospace" font-size="20" fill="#A855F7">  community: "limitless",</text>
      <text x="120" y="230" font-family="monospace" font-size="20" fill="#34D399">  fast: true,</text>
      <text x="120" y="270" font-family="monospace" font-size="20" fill="#F472B6">  openSource: true</text>
      <text x="85" y="310" font-family="monospace" font-size="20" fill="#38BDF8">});</text>
    </svg>`
  );

  // 3. Create 30 Posts with hashtags
  console.log('📝 Creating 30 realistic posts with hashtags...');
  const postSeedData = [
    {
      author: 'stella_nova',
      content: 'Welcome to Orbitly! 🚀 "Keep your circle in orbit." So thrilled to see our new space community take flight. What thoughts are revolving around your mind today? #orbitly #space #community',
      image: `/uploads/${postImage1}`
    },
    {
      author: 'leo_dev',
      content: 'Just deployed the new SQLite + Express backend architecture. Zero external database overhead, ultra-fast sub-millisecond query execution. Simplicity wins every time! #webdev #coding #javascript #sqlite',
      image: `/uploads/${postImage2}`
    },
    {
      author: 'maya_design',
      content: 'Typography tip for social interfaces: High contrast hierarchy and generous line heights (1.5 - 1.6) drastically reduce cognitive fatigue during prolonged browsing sessions. #design #ui #ux #typography'
    },
    {
      author: 'orion_beats',
      content: 'Late night modular synth session in the studio. Captured an ambient frequency modulation that sounds like gravitational waves passing through a pulsar field. #music #synth #ambient #sounddesign'
    },
    {
      author: 'elena_writes',
      content: 'Chapter 14 is done! Writing space opera where communications lag by decades due to the speed of light makes political conspiracies fascinating to orchestrate. #scifi #writing #books #fiction'
    },
    {
      author: 'sam_ai',
      content: 'Exciting progress in multi-agent collaboration benchmarks. Giving agents lightweight persistent memory and specialized roles yields 4x better reasoning performance! #ai #machinelearning #research'
    },
    {
      author: 'clara_travels',
      content: 'Sunrise over Mount Fuji this morning. The way the golden hour mist wraps around the caldera reminded me why I chose a life on the road. #photography #travel #japan #wanderlust'
    },
    {
      author: 'zane_crypto',
      content: 'PSA: Always verify your session management configurations. Double-submit cookies with strict SameSite attributes and HttpOnly storage keep attackers at bay. #cybersecurity #infosec #webdev'
    },
    {
      author: 'stella_nova',
      content: 'The James Webb Space Telescope just revealed another batch of deep-field galaxies that existed barely 300 million years after the Big Bang. Cosmic timeline rewrites in progress! 🔭 #astronomy #space #jwst'
    },
    {
      author: 'leo_dev',
      content: 'Vanilla JavaScript and modern CSS are genuinely underrated. You can build smooth SPAs, optimistic UI states, and responsive layouts without pulling in megabytes of frontend frameworks. #javascript #frontend #webdev'
    },
    {
      author: 'maya_design',
      content: 'Dark mode is not just inverted white! It requires subtle elevation layers, soft purple/indigo undertones, and reduced saturation so icons don\'t blind users at 2 AM. #darkmode #design #ui'
    },
    {
      author: 'orion_beats',
      content: 'New EP "Singularity Orbit" drops next Friday! 7 tracks inspired by orbital mechanics and deep planetary resonance. Preview snippet coming soon. #music #electronic #orbitly'
    },
    {
      author: 'elena_writes',
      content: '"We do not look to the stars to escape our world; we look to understand how fragile and precious our tiny pale blue dot truly is." - Drafting notes. #writing #quotes #philosophy'
    },
    {
      author: 'sam_ai',
      content: 'Testing local lightweight LLMs running entirely on device. The speed and privacy advantages will redefine how personal social apps handle smart feeds. #ai #tech #privacy'
    },
    {
      author: 'clara_travels',
      content: 'Packing light rule #1: If you haven\'t used a lens in your last 3 shoots, leave it at base camp. Keep your gear agile so your creative eye stays free. #photography #gear #travel'
    },
    {
      author: 'zane_crypto',
      content: 'Remember: Parameterized queries with SQLite or PostgreSQL prevent 100% of SQL injection attacks. Don\'t ever build SQL queries via raw string interpolation! #coding #security #backend'
    },
    {
      author: 'stella_nova',
      content: 'Did you know? Saturn\'s rings are only about 10 to 100 meters thick in most places, despite spanning nearly 282,000 kilometers across! Space geometry is wild. #space #astronomy #facts'
    },
    {
      author: 'leo_dev',
      content: 'Optimistic UI updates are the secret sauce to making web apps feel instant. Increment the heart counter right on click, rollback only if the server returns an error. Users love snappiness! #ux #javascript #webdev'
    },
    {
      author: 'maya_design',
      content: 'Working on Orbitly\'s badge & notification animations today. Subtle springs and micro-pulses make social feedback feel alive without being annoying. #design #microinteractions #orbitly'
    },
    {
      author: 'orion_beats',
      content: 'Frequency check: 432 Hz vs 440 Hz standard tuning. What\'s your take on alternative harmonic tunings for ambient soundscapes? #music #audio #sounddesign'
    },
    {
      author: 'elena_writes',
      content: 'Coffee brewed, headphones on, 2,000 words left on the climactic spacewalk scene. Wish me luck with the orbital rendezvous! ☕ #writing #authorlife #scifi'
    },
    {
      author: 'sam_ai',
      content: 'The intersection of computer vision and spatial robotics is accelerating faster than anticipated. Self-docking micro-satellites are now performing millimetric alignment. #robotics #ai #space'
    },
    {
      author: 'clara_travels',
      content: 'Street food tour in Osaka tonight. Takoyaki sizzling fresh on the iron griddle with dancing bonito flakes. Perfection on a skewer! 🐙 #japan #food #travel'
    },
    {
      author: 'zane_crypto',
      content: 'Clean code is code that any teammate can read and understand in 30 seconds without needing a 20-page architecture wiki. Keep it modular and well-named. #coding #software #cleanCode'
    },
    {
      author: 'stella_nova',
      content: 'Looking at tonight\'s clear sky. Mars and Jupiter are in beautiful conjunction just above the eastern horizon. Grab your binoculars if skies are clear! #stargazing #astronomy #sky'
    },
    {
      author: 'leo_dev',
      content: 'Building clean REST APIs with structured JSON errors and predictable HTTP status codes (200, 201, 400, 401, 403, 404, 422) makes frontend development pure joy. #api #backend #express'
    },
    {
      author: 'maya_design',
      content: 'Purple (#7C3AED) paired with pink (#EC4899) creates an iconic modern gradient that radiates energy while staying sophisticated. Orbitly branding is looking crisp! #orbitly #branding #design'
    },
    {
      author: 'orion_beats',
      content: 'Fun fact: NASA recorded the plasma wave emissions of Jupiter\'s magnetosphere and converted them into audio. The universe is literally singing. #space #music #facts'
    },
    {
      author: 'elena_writes',
      content: 'Book signing announcement coming next month! Thank you to all readers who supported my debut interstellar trilogy. You make the journey worthwhile. #books #scifi #grateful'
    },
    {
      author: 'sam_ai',
      content: 'Final thought for today: Technology is at its best when it connects thoughtful minds across distances and enriches genuine curiosity. Keep orbiting! #orbitly #tech #community'
    }
  ];

  const createdPostIds = [];

  for (const p of postSeedData) {
    const authorId = userMap[p.author];
    const postId = queries.createPost(db, {
      author_id: authorId,
      content: p.content,
      image_path: p.image || null
    });
    processPostHashtags(db, postId, p.content);
    createdPostIds.push({ id: postId, authorId, authorUsername: p.author });
  }

  // 4. Create Comments & Nested Replies
  console.log('💬 Creating comments and nested replies...');
  const sampleComments = [
    { postIndex: 0, author: 'leo_dev', text: 'Stunning app launch! Proud to be on Orbitly from day one. 🚀' },
    { postIndex: 0, author: 'maya_design', text: 'The interface gradient and orbit animation feel so smooth and premium!' },
    { postIndex: 1, author: 'stella_nova', text: 'Sub-millisecond query execution is brilliant for real-time social feeds.' },
    { postIndex: 1, author: 'zane_crypto', text: 'Wal mode + foreign keys enabled = reliable, ACID-compliant bliss.' },
    { postIndex: 2, author: 'leo_dev', text: 'Couldn\'t agree more. Line height 1.6 makes reading code snippets effortless.' },
    { postIndex: 3, author: 'elena_writes', text: 'Drop this track link as soon as it\'s mastered! Perfect soundtrack for writing space battles.' },
    { postIndex: 4, author: 'stella_nova', text: 'Relativistic time dilation and communication latency add such immense drama to sci-fi!' },
    { postIndex: 5, author: 'leo_dev', text: 'Persistent context memory is definitely the key milestone.' },
    { postIndex: 6, author: 'maya_design', text: 'That mist layer is pure poetry. Fujisan never ceases to inspire.' },
    { postIndex: 7, author: 'sam_ai', text: 'Double-submit tokens are so elegant when paired with secure cookies.' },
    { postIndex: 8, author: 'elena_writes', text: 'Early universe cosmology never fails to give me chills!' },
    { postIndex: 9, author: 'zane_crypto', text: 'No 500MB node_modules bundle for the browser! Pure vanilla power.' },
    { postIndex: 10, author: 'clara_travels', text: 'Thank you! As someone working in dark airport terminals, my eyes thank you.' },
    { postIndex: 16, author: 'leo_dev', text: '10 meters thick?! That blows my mind every single time.' }
  ];

  const createdCommentIds = [];

  for (const c of sampleComments) {
    const post = createdPostIds[c.postIndex];
    const commentId = queries.createComment(db, {
      post_id: post.id,
      author_id: userMap[c.author],
      content: c.text
    });
    createdCommentIds.push({ id: commentId, postId: post.id, authorId: userMap[c.author] });
  }

  // Nested Replies (1 level deep)
  console.log('↪️ Adding nested replies...');
  const replies = [
    { commentIndex: 0, author: 'stella_nova', text: 'Thank you Leo! Excited to have you building the frontier with us.' },
    { commentIndex: 1, author: 'stella_nova', text: 'Credits to our design mastermind Maya for the orbit aesthetic! ✨' },
    { commentIndex: 2, author: 'leo_dev', text: 'Exactly, zero network hop latency for local SQLite transactions.' },
    { commentIndex: 5, author: 'orion_beats', text: 'Sending you an uncompressed master preview file right now, Elena!' },
    { commentIndex: 6, author: 'elena_writes', text: 'Exactly Stella! Can\'t wait to share the finished draft with you.' },
    { commentIndex: 13, author: 'stella_nova', text: 'Right? Relative to their width, Saturn\'s rings are thinner than razor blades.' }
  ];

  for (const r of replies) {
    const parent = createdCommentIds[r.commentIndex];
    queries.createComment(db, {
      post_id: parent.postId,
      author_id: userMap[r.author],
      parent_id: parent.id,
      content: r.text
    });
  }

  // 5. Create Likes on Posts and Comments
  console.log('❤️ Generating post and comment likes...');
  const userIds = Object.values(userMap);

  for (const post of createdPostIds) {
    // Like each post with 2 to 6 random users
    const likers = [...userIds].sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 5) + 2);
    for (const uid of likers) {
      queries.likePost(db, uid, post.id);
    }
  }

  for (const comment of createdCommentIds) {
    // Like comments
    const likers = [...userIds].sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 4) + 1);
    for (const uid of likers) {
      queries.likeComment(db, uid, comment.id);
    }
  }

  // 6. Generate Notifications
  console.log('🔔 Creating notifications...');
  for (const [follower, following] of followPairs.slice(0, 10)) {
    queries.createNotification(db, {
      recipient_id: userMap[following],
      sender_id: userMap[follower],
      type: 'follow'
    });
  }

  for (const c of sampleComments.slice(0, 8)) {
    const post = createdPostIds[c.postIndex];
    if (post.authorId !== userMap[c.author]) {
      queries.createNotification(db, {
        recipient_id: post.authorId,
        sender_id: userMap[c.author],
        type: 'comment',
        post_id: post.id
      });
    }
  }

  console.log('✅ Orbitly database seeded successfully!');
  console.log(`   - 8 Users created (password: "demo1234")`);
  console.log(`   - 30 Posts with hashtags`);
  console.log(`   - 20+ Comments & nested replies`);
  console.log(`   - 100+ Likes`);
  console.log(`   - Active follow graph and notifications`);
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Seeding error:', err);
      process.exit(1);
    });
}

module.exports = seed;
