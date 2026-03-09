import type { Metadata } from 'next'
import { Bebas_Neue, DM_Mono, Syne } from 'next/font/google'
import '@/styles/globals.css'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
})

const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
})

const syne = Syne({
  weight: ['700', '800'],
  subsets: ['latin'],
  variable: '--font-syne',
})

export const metadata: Metadata = {
  title: 'Kyro — Developer Asset Marketplace',
  description: 'Discover, showcase, and sell developer tools, templates, APIs, and more. You keep 100% — Kyro never touches your revenue.',
  openGraph: {
    title: 'Kyro',
    description: 'Developer asset marketplace. Upload once. Earn forever.',
    siteName: 'Kyro',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${dmMono.variable} ${syne.variable}`}>
      <body>
        <div id="cur" />
        <div id="cur-ring" />
        {children}
        <div className="k-toast" id="toast" />
        <script dangerouslySetInnerHTML={{ __html: CURSOR_SCRIPT }} />
      </body>
    </html>
  )
}

const CURSOR_SCRIPT = `
(function(){
  var cur=document.getElementById('cur'),ring=document.getElementById('cur-ring');
  if(!cur||!ring)return;
  var mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;cur.style.left=mx+'px';cur.style.top=my+'px';});
  (function ar(){rx+=(mx-rx)*.1;ry+=(my-ry)*.1;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(ar);})();
  function hook(){document.querySelectorAll('a,button,input,select,textarea,[data-hover]').forEach(function(el){el.addEventListener('mouseenter',function(){document.body.classList.add('ch');});el.addEventListener('mouseleave',function(){document.body.classList.remove('ch');});});}
  hook();
  var obs=new MutationObserver(hook);
  obs.observe(document.body,{childList:true,subtree:true});
  window.showToast=function(msg){var t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},3200);};
})();
`
