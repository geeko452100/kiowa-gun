"use client";

import { useEffect, useState } from "react";
import RichTextEditor from "./RichTextEditor";
import { useConfirm } from "./useConfirm";
import { adminFetch } from "./adminFetch";

type Post = { id: number; title: string; bodyHtml: string; isPublished: number; publishedAt: string };

export default function NewsAdmin() {
  const { confirm, dialog } = useConfirm();
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/news");
    setPosts((await res.json()) as Post[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addPost(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = await adminFetch("/api/admin/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, bodyHtml, isPublished: true }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setBodyHtml("");
    setFormKey((k) => k + 1);
    void load();
  }

  async function togglePublish(post: Post) {
    setError("");
    const result = await adminFetch(`/api/admin/news/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: post.title,
        bodyHtml: post.bodyHtml,
        isPublished: post.isPublished ? false : true,
      }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  async function remove(post: Post) {
    const ok = await confirm(`Delete the post "${post.title}"? This cannot be undone.`);
    if (!ok) return;
    setError("");
    const result = await adminFetch(`/api/admin/news/${post.id}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  return (
    <div>
      {dialog}
      <h1>News</h1>

      <form className="admin-form" onSubmit={addPost}>
        <strong>New post</strong>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <RichTextEditor key={formKey} label="Body" value={bodyHtml} onChange={setBodyHtml} />
        {error && <p className="admin-error">{error}</p>}
        <button type="submit">Publish post</button>
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id}>
              <td>{p.title}</td>
              <td>{p.isPublished ? "Published" : "Hidden"}</td>
              <td className="admin-row-actions">
                <button type="button" onClick={() => togglePublish(p)}>
                  {p.isPublished ? "Hide" : "Publish"}
                </button>
                <button type="button" className="danger" onClick={() => remove(p)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
