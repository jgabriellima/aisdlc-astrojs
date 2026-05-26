import type { CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

export function getPostSlug(post: BlogPost): string {
	return post.id.replace(/\.mdx?$/, '');
}

export function isPublishedPost(post: BlogPost): boolean {
	return !post.data.draft;
}

export function sortPostsByDateNewestFirst(posts: BlogPost[]): BlogPost[] {
	return [...posts].sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);
}
