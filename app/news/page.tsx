import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { newsPosts } from "@/lib/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "../styles/news.css";

export const metadata = { title: "News - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const db = await getDb();
  const posts = await db
    .select()
    .from(newsPosts)
    .where(eq(newsPosts.isPublished, 1))
    .orderBy(desc(newsPosts.publishedAt));

  return (
    <>
      <Header active="news" />
      <main className="container" id="main">
        {posts.map((post) => (
          <section key={post.id} className="content-section notice">
            <h2>{post.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
