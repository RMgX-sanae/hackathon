import {
  createElement, AudioLines, ShieldCheck, ScanLine, RotateCcw, PanelsTopLeft,
  Info, MousePointer2, SlidersHorizontal, ArrowRight, CheckCheck, LocateFixed,
  Check, Copy, Volume2, Play, Menu, Search, Heart, ShoppingBag, CircleHelp,
  UserRound, ArrowUpRight, CircleAlert, CircleCheck, CodeXml, Headphones,
} from 'lucide';

const icons = { AudioLines, ShieldCheck, ScanLine, RotateCcw, PanelsTopLeft,
  Info, MousePointer2, SlidersHorizontal, ArrowRight, CheckCheck, LocateFixed,
  Check, Copy, Volume2, Play, Menu, Search, Heart, ShoppingBag, CircleHelp,
  UserRound, ArrowUpRight, CircleAlert, CircleCheck, CodeXml, Headphones };

export function icon(name) {
  return createElement(icons[name], { 'aria-hidden': 'true', focusable: 'false', width: 20, height: 20, 'stroke-width': 1.8 }).outerHTML;
}

export function mountIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(element => {
    element.innerHTML = icon(element.dataset.icon);
    element.removeAttribute('data-icon');
    element.setAttribute('aria-hidden', 'true');
  });
}
