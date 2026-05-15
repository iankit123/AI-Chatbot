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
  naina: [
    {
      id: "naina1",
      companionId: "naina",
      url: "/images/naina.png",
      description: "Golden hour on the terrace—one of my calm moments",
      prompt:
        "I have a photo from a quiet evening on the terrace—want to see?",
      response:
        "This is one of my favorite peaceful moments. I love when the light is soft like this. What kind of moments calm you down?",
    },
  ],
  priya: [
    {
      id: "priya1",
      companionId: "priya",
      url: "/images/priya-gallery/priya-photo-1.png",
      description: "Pink saree at the temple steps — one of my favourite looks",
      prompt: "Want to see me in this pink saree? I clicked this at the temple steps 😊",
      response:
        "This saree is one of my favourites — the colour just felt right that day. Do you like traditional looks on me?",
    },
    {
      id: "priya2",
      companionId: "priya",
      url: "/images/priya-gallery/priya-photo-2.png",
      description: "Evening out in my black dress",
      prompt: "Getting ready for a night out — want a quick peek? 😄",
      response:
        "Felt bold in this black dress. What do you think — should I wear this more often?",
    },
  ],

  // We can add other companions in the future
  ananya: [
    {
      id: "ananya1",
      companionId: "ananya",
      url: "/images/ananya-gallery/ananya-photo-1.png",
      description: "Blue saree on the bed",
      prompt: "Want to see a cozy photo of me? 😊",
      response: "This one feels calm and homely — do you like it?",
    },
    {
      id: "ananya2",
      companionId: "ananya",
      url: "/images/ananya-gallery/ananya-photo-2.png",
      description: "Kitchen moment",
      prompt: "Caught me in the kitchen — want a peek?",
      response: "I was chopping fruit — very everyday me!",
    },
    {
      id: "ananya3",
      companionId: "ananya",
      url: "/images/ananya-gallery/ananya-photo-3.png",
      description: "Navy butterfly saree outdoors",
      prompt: "Outdoor saree click — shall I show you?",
      response: "The butterflies on this saree are my favourite detail.",
    },
  ],
  meera: [
    {
      id: "meera1",
      companionId: "meera",
      url: "/images/meera-gallery/meera-photo-1.png",
      description: "Purple saree at the temple steps",
      prompt: "Want to see me in this purple saree? 😊",
      response: "Loved this look — the colour felt so peaceful that day.",
    },
    {
      id: "meera2",
      companionId: "meera",
      url: "/images/meera-gallery/meera-photo-2.png",
      description: "Evening street moment",
      prompt: "Caught me on a little evening walk — want a peek?",
      response: "The breeze that evening was perfect.",
    },
    {
      id: "meera3",
      companionId: "meera",
      url: "/images/meera-gallery/meera-photo-3.png",
      description: "Market day in blue saree",
      prompt: "Market day selfie — shall I show you?",
      response: "These colours always make me happy.",
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
