import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to match page by default
  redirect('/match');
}
