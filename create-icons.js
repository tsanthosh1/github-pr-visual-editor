/**
 * Simple Icon Generator - Creates PNG icons without external dependencies
 * Run with: node create-icons.js
 */

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Pre-generated PNG icons as base64 (green checkmark on rounded square)
// These are minimal valid PNGs created for each size

const icons = {
  16: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA0klEQVQ4y62TwQ3CMAyGvwhGyAqsABtwE7BBN2CEHuAmrNAN2IARyAYZwRtQpOZCEqV0gJ/ynPj7YyeBf1WJAqAB5sAa6IBOD6rn+TjwDGzJTAn47YEXYBH4FXAOdMAN8OpJJeD1ngvvD6oCHoEpcAgsE7EJMARWwAGYAbfAGJgkYqviTKXggbK8K2BbiJsqbsxKCO1dAvDkOVdi7nUHPHsyDpTXuaWYU+ARGCfidIXDDJhWSHyPmQKX5J+5As4Kh0UlPqbYxcBFIS6rxN+oBb4B5FpuaeFcw/kAAAAASUVORK5CYII=',
  32: 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABQ0lEQVRYw+2WsQ3CMBBFfxAjtIQRvAJsgAewCRukpKEjK7ABG8AIZINkBG8AGxAKHIhIxpjYMaL5VRLd+f6dc+xARF9TqQLAAMiANYAdgJ0W6o77OPAEbAnMCGgtcA8sgRGQ6/8CKIAbYA+8aNJYYKjnwt0nKgbuAJwBYwAzBUYQsARwCWAK4AzAEMBYgVWFmVLBLcWvCtg6YqPmxlyE0N4mAA8Gc03mTnfArSZjT3mdG/I5ARqBSSFONjjMAFyWSDz7zDhwSv7pS+DMcJgZ8THFLgYuHHGpEF9DbKPh3BOX3jHRYHJtJO54nwQ8+xHm3ubAqyYTT1kNexaEeMN+asmN1Y1mNb3n3Jw7E+ApsANa4EUhvmTYBuDc00dKJc6mOC6AgcdhHokPmTYCLj198wvgzNOnmRHvE+xE4MoQlyvidWoCPwGJG5nL5SZ3swAAAABJRU5ErkJggg==',
  48: 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABmUlEQVRoge2YMU7DQBBF/wZK6LgCHCBcgAtwA3KB0FFSchUuwAW4AEegIzeAI9ARGsQi7bIbO3GSDeKX43X2zZ/xrHcN8C8kowYAAJlQTAEsCewI7JhQ2Nw/jg0/AFsKkwRoXnAPrACMCKz1vwQq4IbAHsDeCsUJ9LLnzPuDygXuAMwATACMNBgLAivJXwJYArgAMAEw1mBV4TNJQX/ip4r+FoLNmhsxCKV9CAAetJg7PwCuNJkYsvq9LnYcwGPgJdCVY6HOgVsNxuLgqQJMKEx6xfkGgKkKvxp/TG8B+PrA4QwYBUiuMLnJdTDgwiHmALYBp5p2gQtNJsYYq8dcFuJteAr0wS8BZ4ZDpI8dU8zZwIUhzurE70HsE8xsevTFJL/mz5z3wIPGJK5shnss1EcQ4g1tNC1xf3Vj3M29CXAtOIy5YL/2JLAjMAzQj9sL/5Jgp4JzoAvQqQKMDXGexecELCy9qZT4HGJnAfb8+GQy4nsO9gD2HP0pRuKjjxs+8BNgW4DdBz5jPgR4OPuuMeLdH2sU4NIQxzLxFWqC78AnEP2g8QAAAABJRU5ErkJggg==',
  128: 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAADk0lEQVR4nO3dMW7bQBCG4X+BNO4C5AhKLpAb5Aa+gW/gJk2qnCIX8AV8A98gOYJzBKdx44CQhfBRIpeSSO6O+L0KIjmcHc5QFEnhnyRJ0r9M/x5AvOXBzzTwCrAgsAOwZkKw1v44FhwCWMGYBGBe4A5YAhgCyPR/DpTAJYE1gK0Tigvgic+Z9wflGbgDMAcwBTDTYAJgKblzACsAEwBTDVYWT7oJDFzRo2j+BILLLZgxKKF9AADYKDE/fgJcajIRRF7/sBk7Auwtf4Lj0ObAnSYTIfaEQAKgJ+9xfANgrME3k4+pDYBfEzzOACGAaIfkJL3WdODCEvMAfgowF7Ac/JTAjoI+gfx4vfgXCbZqcGZxiSIcEvgJDGN+ILjIZShu7NlCBGkT4Ex4GPXRrhBvQJMJ0CrRmtSvCTBdP3PuA/ekMYkp+14wRJDhAK2tYUJxp+vAxQYm1pJfezDZJdjL3MZz4EqTiRhbPSIFOPSaT8fU7Ub7Ov8bAR40WTiKL9CocR+DwP+/AnEE/c3Iq4C98GcJtgCGHro+eCDf4+wZcJhzgFdoIYqwEST7zm4A3Bq6EMNEh997ALgxNGfZ0S863VDBHkO7BpwrtFLAGfKA38ZcAXgyrG+NEe8r0XfIPAVzBhz5o+9bkjxdmvP6E3gLucQcwC7gE3NdIPTDc4dsauvjrLBs/f/4fYV6DtcGC8NOdboJAA6Bfqh+wc9JTxM8SjELYCx4CXXSsAzT/xHgm0B9jzxE/0Y0YiGR2v24OTKFPt25A4E10Bfgr+Gu1w3c8TTRDsr0tqBawiDCAy5pnALYExh7RHXEh4mOE24hxr1EoRT+gEHkxs+d28EPAp8jLGH0O+/lF4G/i0E/h7sMnZPYENwCPQjdJbeLYEJgUOKfQ+/CHgSPFS8AnCgxRPnrsEuwJ7g8efMa8K9zC3EF8JLgfbj5bCfEpw5Dtep2yZxp/EWfDTBocV+bD6L0AnfcI/pRuCz0JdKI26muI/QQbhL8D2/CrBnOPyuxFMO7hK8TbmD3I+K7TlgHYSfvzKc52EHd7bYoSYTfQ88hPAK9IXeM+4TnBv6c4jE+y5sJHgQ4kZwL7zH2Hfwd0p8KnAN9zLxKwq7Htwn0E+JN0Kc+BPMFLCM0pv2EswYcpj7FYO7cAqDEgPBaRJ7LbhJ8BD8VYm3Atxy7IHH2EPcK3wSfBJ0x8H/EXv2saeB/1eC0xeJnxKfJ9g/gF8EvBLsW/BdxpeFuyB2VeA9x7xT/E+SJP1TvwEkKU7MdFulegAAAABJRU5ErkJggg=='
};

console.log('🎨 Creating PNG icons...\n');

Object.entries(icons).forEach(([size, base64]) => {
  const buffer = Buffer.from(base64, 'base64');
  const filename = `icon${size}.png`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, buffer);
  console.log(`✅ Created ${filename}`);
});

console.log('\n🎉 All icons created successfully!');
console.log(`📁 Icons saved to: ${iconsDir}`);
