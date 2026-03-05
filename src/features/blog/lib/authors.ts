export type BlogAuthor = {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatar: string;
};

const AUTHORS: Record<string, BlogAuthor> = {
  'travelapp-editorial': {
    id: 'travelapp-editorial',
    name: 'TravelApp Editorial Team',
    role: 'Travel Researchers',
    bio: 'We publish evidence-driven guides to help travelers book better stays with less friction.',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80'
  }
};

export function getAuthorById(id: string): BlogAuthor | undefined {
  return AUTHORS[id];
}

