const Meet = require('../models/Meet');
const User = require('../models/User');
const { sendMatchEmail } = require('./mailer');

const VENUES = [
  'New Tikka', 'Pepsi Cut', 'Gymkhana Backside', 'Nehru Museum', 'Technology Club Park',
  'Gymkhana Lake', 'Main Building', 'Techmarket Front', 'HJB Night Canteen', 
  'VS Night Canteen', 'Maggu Room', 'LLR Basketball Courts', 'Sahara', 
  'TSC Front', 'Nalanda Subway Side'
];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randTime() {
  const hour24 = 20 + Math.floor(Math.random() * 4); // 8pm - 11pm
  const minute = ['00', '15', '30', '45'][Math.floor(Math.random() * 4)];
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 > 12 ? hour24 - 12 : hour24;
  return `${hour12}:${minute} ${suffix}`;
}

function generateDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1); // Defaults to tomorrow
  return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

function countTagOverlap(a, b) {
  return a.filter(tag => b.includes(tag)).length;
}

// Core function to merge pending requests into 1 finalized matched block
async function finalizeMeet(meetArray) {
  const finalMeet = meetArray[0];
  const participants = [];
  const tags = new Set();
  
  for (let m of meetArray) {
    participants.push(m.participants[0]); // Email
    m.tags.forEach(t => tags.add(t));
    if (m._id.toString() !== finalMeet._id.toString()) {
       await Meet.findByIdAndDelete(m._id); // Cleanup redundant pending requests
    }
  }
  
  const users = await User.find({ email: { $in: participants } });
  const nicknames = participants.map(email => {
     const u = users.find(u => u.email === email);
     return u ? u.nickname : 'Unknown';
  });

  finalMeet.participants = participants;
  finalMeet.nicknames = nicknames;
  finalMeet.tags = Array.from(tags);
  finalMeet.status = 'matched';
  finalMeet.venue = rand(VENUES);
  finalMeet.time = randTime();
  finalMeet.date = generateDate();
  
  await finalMeet.save();
  
  // Asynchronously dispatch beautiful emails to all participants
  sendMatchEmail(finalMeet).catch(e => console.error(e));
  
  return finalMeet;
}

async function tryImmediateMatch(newMeetId) {
  const incoming = await Meet.findById(newMeetId);
  if (!incoming || incoming.status !== 'pending') return null;

  // Grab pending meets of same type, sorted oldest first (Wait-time tiebreaker)
  const queue = await Meet.find({ status: 'pending', type: incoming.type, _id: { $ne: incoming._id } }).sort({ createdAt: 1 });
  
  if (incoming.type === 'solo') {
    if (queue.length < 1) return null;
    
    let bestMatch = null;
    let bestScore = -1;
    
    for (const candidate of queue) {
      const overlap = countTagOverlap(incoming.tags, candidate.tags);
      if (overlap > bestScore) {
        bestMatch = candidate;
        bestScore = overlap;
      }
    }
    
    if (bestMatch) {
       return await finalizeMeet([incoming, bestMatch]);
    }
  }
  
  if (incoming.type === 'squad') {
    if (queue.length < 3) return null;
    
    const scored = queue.map(c => ({ candidate: c, overlap: countTagOverlap(incoming.tags, c.tags) }));
    scored.sort((a, b) => b.overlap - a.overlap);
    
    const selected = scored.slice(0, 3).map(s => s.candidate);
    return await finalizeMeet([incoming, ...selected]);
  }
  
  return null;
}

async function processStaleRequests() {
  // Looks for timeouts strictly past the 2 hour barrier
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const staleMeets = await Meet.find({ status: 'pending', createdAt: { $lt: twoHoursAgo } });
  
  for (const request of staleMeets) {
     const currentCheck = await Meet.findById(request._id);
     if (!currentCheck || currentCheck.status !== 'pending') continue;
     
     const queue = await Meet.find({ status: 'pending', type: request.type, _id: { $ne: request._id } });
     
     if (request.type === 'solo' && queue.length >= 1) {
       const partner = rand(queue);
       await finalizeMeet([request, partner]);
       continue;
     }
     
     if (request.type === 'squad' && queue.length >= 3) {
       const shuffled = queue.sort(() => 0.5 - Math.random());
       const partners = shuffled.slice(0, 3);
       await finalizeMeet([request, ...partners]);
       continue;
     }
     
     // If truly no one is waiting on the exact server scale, fully refund the user credits
     const user = await User.findOne({ email: request.participants[0] });
     if (user) {
       user.credits += 1;
       await user.save();
     }
     await Meet.findByIdAndDelete(request._id);
  }
  console.log(`[Cron] Evaluated ${staleMeets.length} stale requests.`);
}

module.exports = { tryImmediateMatch, processStaleRequests };
