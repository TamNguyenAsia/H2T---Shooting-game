// Ghép nhiều SVG chồng lên nhau (chỉ để xem thử khi vẽ)
KH.stack = (svgs, w = 512, h = 512) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svgs.join('')}</svg>`;
KH.dress = (o, t) => KH.stack([KH.body(), KH.layer('armor', o.armor, t), KH.layer('ring', o.ring, t), KH.layer('hat', o.hat, t), KH.layer('weapon', o.weapon, t)]);
