import type { Metadata } from 'next';
import { getVow } from '@/lib/contract';
import VowPageClient from './VowPageClient';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const vow = await getVow(Number(params.id));
    if (vow) {
      const stakeSTX = Number(vow.stakeAmount || vow['stake-amount'] || 0) / 1_000_000;
      const title = `${vow.title} — DEADLOCK VOW #${params.id}`;
      const description = `${vow.description ?? ''} | ${stakeSTX} STX at stake on Stacks.`;
      return {
        title,
        description,
        openGraph: { title, description, images: ['/og-image.png'] },
        twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png'] },
      };
    }
  } catch {}
  return {
    title: `VOW #${params.id} — DEADLOCK`,
    description: 'Public accountability vow secured on Stacks / Bitcoin L2.',
  };
}

export default function VowPage() {
  return <VowPageClient />;
}
