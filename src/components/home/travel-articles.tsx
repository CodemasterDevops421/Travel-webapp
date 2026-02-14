import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const articles = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=300&h=200&fit=crop',
    title: "A Baby Boomer's Guide to Travel Insurance",
    excerpt: "Travel insurance - what you need, when to buy it, where to get it - is one of the topics many traveling baby boomers need to understand.",
    author: null
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop',
    title: 'Interview with Travel Expert Anita Dunham-Potter',
    excerpt: "As a recognized authority on travel, Anita is often interviewed by major media outlets. She has appeared on CBS' The Early Show as well as online chats.",
    author: 'Anita Dunham-Potter'
  }
];

export function TravelArticles() {
  return (
    <section className="py-12 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-10">
          Travel Articles
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {articles.map((article) => (
            <Card key={article.id} className="overflow-hidden flex flex-col md:flex-row">
              <div className="w-full md:w-1/3 h-48 md:h-auto">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-4 flex-1 flex flex-col justify-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {article.excerpt}
                </p>
                <Button 
                  variant="link" 
                  className="text-teal-600 hover:text-teal-700 p-0 h-auto font-semibold self-start"
                >
                  Read More
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mt-8">
          <div className="w-2 h-2 rounded-full bg-teal-500" />
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <div className="w-2 h-2 rounded-full bg-gray-300" />
        </div>
      </div>
    </section>
  );
}
