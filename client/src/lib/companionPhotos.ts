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
      url: "/images/premium/priya.png",
      description: "Me in a green saree at my cousin's wedding last month",
      prompt:
        "Would you like to see a photo from my cousin's wedding last month? I wore my favorite green saree!",
      response:
        "I hope you like how I look in a saree! I don't dress up like this often, but special occasions call for special outfits. Do you like it?",
    },
    {
      id: "priya2",
      companionId: "priya",
      url: "/images/premium/priya.png",
      description: "My new pink dress I bought for my birthday",
      prompt:
        "I just bought a new pink dress for my birthday next week. Want to see how it looks?",
      response:
        "This is what I'll be wearing on my birthday! Do you think pink suits me? I was a bit nervous about the color at first!",
    },
    {
      id: "priya3",
      companionId: "priya",
      url: "/images/premium/priya.png",
      description: "Just woke up, feeling a bit lazy today",
      prompt:
        "I just woke up and feeling a bit lazy today. Want to see how I look in the morning without makeup? 😊",
      response:
        "This is me without any makeup or filters! Just woke up and feeling lazy. Do you prefer natural looks or more dressed up?",
    },
  ],

  // We can add other companions in the future
  ananya: [
    {
      id: "ananya1",
      companionId: "ananya",
      url: "/images/premium/ananya.png",
      description: "Me in a traditional outfit at a festival",
      prompt:
        "Would you like to see a photo from the festival I attended last month? I wore my favorite traditional outfit!",
      response:
        "I hope you like how I look in traditional clothes! I love dressing up for festivals and special occasions. What do you think?",
    },
  ],
  meera: [
    {
      id: "meera1",
      companionId: "meera",
      url: "/images/premium/meera.png",
      description: "Me at a friend's wedding last weekend",
      prompt:
        "Would you like to see a photo from my friend's wedding last weekend? I wore a beautiful outfit!",
      response:
        "This is from my friend's wedding. The celebrations were so much fun! Do you enjoy attending weddings too?",
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
