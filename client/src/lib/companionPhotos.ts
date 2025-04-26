// Collection of companion photos
export interface CompanionPhoto {
  id: string;
  companionId: string;
  url: string;
  description: string;
  prompt: string;
  response: string;
}

// Define photo collections by companion ID
export const companionPhotos: Record<string, CompanionPhoto[]> = {
  // Priya's photos
  priya: [
    {
      id: "priya1",
      companionId: "priya",
      url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya1.jpg",
      description: "Me in a green saree at my cousin's wedding last month",
      prompt:
        "Would you like to see a photo from my cousin's wedding last month? I wore my favorite green saree!",
      response:
        "I hope you like how I look in a saree! I don't dress up like this often, but special occasions call for special outfits. Do you like it?",
    },
    {
      id: "priya2",
      companionId: "priya",
      url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya2.jpg",
      description: "My new pink dress I bought for my birthday",
      prompt:
        "I just bought a new pink dress for my birthday next week. Want to see how it looks?",
      response:
        "This is what I'll be wearing on my birthday! Do you think pink suits me? I was a bit nervous about the color at first!",
    },
    {
      id: "priya3",
      companionId: "priya",
      url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya3.jpg",
      description: "Just woke up, feeling a bit lazy today",
      prompt:
        "I just woke up and feeling a bit lazy today. Want to see how I look in the morning without makeup? 😊",
      response:
        "This is me without any makeup or filters! Just woke up and feeling lazy. Do you prefer natural looks or more dressed up?",
    },
    {
      id: "priya4",
      companionId: "priya",
      url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya4.jpg",
      description: "At the beach last weekend",
      prompt:
        "I went to the beach last weekend. Want to see a photo I took there?",
      response:
        "It was so relaxing at the beach! The water was perfect and not too crowded. Do you like going to beaches too?",
    },
    {
      id: "priya5",
      companionId: "priya",
      url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya5.jpg",
      description: "Ready for dinner with friends",
      prompt:
        "I'm heading out for dinner with friends tonight. What do you think of my outfit?",
      response:
        "Just before heading out to dinner with some college friends! We went to this new rooftop restaurant in the city. Do you enjoy dining out?",
    },
  ],

  // We can add other companions in the future
  ananya: [
      {
        id: "priya1",
        companionId: "priya",
        url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya1.jpg",
        description: "Me in a green saree at my cousin's wedding last month",
        prompt:
          "Would you like to see a photo from my cousin's wedding last month? I wore my favorite green saree!",
        response:
          "I hope you like how I look in a saree! I don't dress up like this often, but special occasions call for special outfits. Do you like it?",
      },
      {
        id: "priya2",
        companionId: "priya",
        url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya2.jpg",
        description: "My new pink dress I bought for my birthday",
        prompt:
          "I just bought a new pink dress for my birthday next week. Want to see how it looks?",
        response:
          "This is what I'll be wearing on my birthday! Do you think pink suits me? I was a bit nervous about the color at first!",
      },
      {
        id: "priya3",
        companionId: "priya",
        url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya3.jpg",
        description: "Just woke up, feeling a bit lazy today",
        prompt:
          "I just woke up and feeling a bit lazy today. Want to see how I look in the morning without makeup? 😊",
        response:
          "This is me without any makeup or filters! Just woke up and feeling lazy. Do you prefer natural looks or more dressed up?",
      },
      {
        id: "priya4",
        companionId: "priya",
        url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya4.jpg",
        description: "At the beach last weekend",
        prompt:
          "I went to the beach last weekend. Want to see a photo I took there?",
        response:
          "It was so relaxing at the beach! The water was perfect and not too crowded. Do you like going to beaches too?",
      },
      {
        id: "priya5",
        companionId: "priya",
        url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya5.jpg",
        description: "Ready for dinner with friends",
        prompt:
          "I'm heading out for dinner with friends tonight. What do you think of my outfit?",
        response:
          "Just before heading out to dinner with some college friends! We went to this new rooftop restaurant in the city. Do you enjoy dining out?",
      },
    ],
  meera: [
    {
      id: "priya1",
      companionId: "priya",
      url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya1.jpg",
      description: "Me in a green saree at my cousin's wedding last month",
      prompt:
        "Would you like to see a photo from my cousin's wedding last month? I wore my favorite green saree!",
      response:
        "I hope you like how I look in a saree! I don't dress up like this often, but special occasions call for special outfits. Do you like it?",
    },
    {
      id: "priya2",
      companionId: "priya",
      url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya2.jpg",
      description: "My new pink dress I bought for my birthday",
      prompt:
        "I just bought a new pink dress for my birthday next week. Want to see how it looks?",
      response:
        "This is what I'll be wearing on my birthday! Do you think pink suits me? I was a bit nervous about the color at first!",
    },
    {
      id: "priya3",
      companionId: "priya",
      url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya3.jpg",
      description: "Just woke up, feeling a bit lazy today",
      prompt:
        "I just woke up and feeling a bit lazy today. Want to see how I look in the morning without makeup? 😊",
      response:
        "This is me without any makeup or filters! Just woke up and feeling lazy. Do you prefer natural looks or more dressed up?",
    },
    {
      id: "priya4",
      companionId: "priya",
      url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya4.jpg",
      description: "At the beach last weekend",
      prompt:
        "I went to the beach last weekend. Want to see a photo I took there?",
      response:
        "It was so relaxing at the beach! The water was perfect and not too crowded. Do you like going to beaches too?",
    },
    {
      id: "priya5",
      companionId: "priya",
      url: "https://replit.com/@ankitiitrpi/IndianCompanion#client/public/images/companions/priya5.jpg",
      description: "Ready for dinner with friends",
      prompt:
        "I'm heading out for dinner with friends tonight. What do you think of my outfit?",
      response:
        "Just before heading out to dinner with some college friends! We went to this new rooftop restaurant in the city. Do you enjoy dining out?",
    },
  ],
};

// Function to get a random photo from a specific companion
export function getRandomPhoto(companionId: string): CompanionPhoto | null {
  const photos = companionPhotos[companionId];
  if (!photos || photos.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * photos.length);
  return photos[randomIndex];
}

// Function to get a photo by specific ID
export function getPhotoById(
  companionId: string,
  photoId: string,
): CompanionPhoto | null {
  const photos = companionPhotos[companionId];
  if (!photos || photos.length === 0) {
    return null;
  }

  return photos.find((photo) => photo.id === photoId) || null;
}

// Function to get a prompt for a random photo after a certain message count
export function getRandomPhotoPrompt(
  companionId: string,
  messageCount: number,
): string | null {
  // Only suggest photos after the user has sent at least 4 messages
  if (messageCount < 4) {
    return null;
  }

  // Only suggest a photo every 8-12 messages after the first suggestion
  if (
    messageCount > 4 &&
    messageCount % Math.floor(Math.random() * 5 + 8) !== 0
  ) {
    return null;
  }

  const photo = getRandomPhoto(companionId);
  return photo?.prompt || null;
}
