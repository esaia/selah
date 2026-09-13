import { describe, expect, it } from 'vitest';

import { detectFormat } from './detect';
import { mergeBibles, parseBibleXml } from './parse';
import { bookNamesOf, verseCountOf, type ParsedBible } from './types';

const zefania = `<?xml version="1.0" encoding="UTF-8"?>
<XMLBIBLE biblename="Our own edition">
  <BIBLEBOOK bnumber="1" bname="Genesis">
    <CHAPTER cnumber="1">
      <VERS vnumber="1">In the beginning<NOTE> a footnote nobody can read on a wall </NOTE> God created.</VERS>
      <VERS vnumber="2">And the earth was &amp; is.</VERS>
    </CHAPTER>
    <CHAPTER cnumber="2"><VERS vnumber="1">Thus the heavens.</VERS></CHAPTER>
  </BIBLEBOOK>
  <BIBLEBOOK bnumber="59" bname="James">
    <CHAPTER cnumber="1"><VERS vnumber="1">James, a servant.</VERS></CHAPTER>
  </BIBLEBOOK>
</XMLBIBLE>`;

const opensong = `<bible>
  <b n="Genesis">
    <c n="1">
      <v n="1">In the beginning</v>
      <v n="2">And the earth</v>
    </c>
  </b>
  <b n="Revelation"><c n="1"><v n="1">The revelation</v></c></b>
</bible>`;

const beblia = `<bible>
  <b n="1"><c n="1"><v n="1">In the beginning</v></c></b>
  <b n="66"><c n="22"><v n="21">The grace</v></c></b>
</bible>`;

const osis = `<osis><osisText><header><work osisWork="OurBible"/></header>
  <div type="book" osisID="Gen">
    <chapter osisID="Gen.1">
      <title type="section">A heading, not a verse</title>
      <verse osisID="Gen.1.1">In the beginning<note>dropped</note> God created.</verse>
      <verse osisID="Gen.1.2">And the earth.</verse>
    </chapter>
  </div>
  <div type="book" osisID="Jas">
    <chapter osisID="Jas.1">
      <verse sID="v1" osisID="Jas.1.1"/>James, a servant.<verse eID="v1"/>
      <verse sID="v2" osisID="Jas.1.2"/>Count it joy.<verse eID="v2"/>
    </chapter>
  </div>
</osisText></osis>`;

const usx = `<usx version="3.0">
  <book code="GEN" style="id">Our own edition</book>
  <para style="h">Genesis</para>
  <chapter number="1" style="c"/>
  <para style="s1">The creation</para>
  <para style="p"><verse number="1" style="v"/>In the beginning<note caller="+" style="f">dropped</note> God created.<verse eid="1"/><verse number="2" style="v"/>And the earth</para>
  <para style="p">was without form.<verse eid="2"/></para>
</usx>`;

const genesis = (bible: ParsedBible | null) => bible?.books.find(book => book.position === 1);

describe('telling the five apart', () => {
  it('reads the root element', () => {
    expect(detectFormat(zefania)).toBe('zefania');
    expect(detectFormat(usx)).toBe('usx');
    expect(detectFormat(osis)).toBe('osis');
  });

  it('tells OpenSong from Beblia by whether the book is named or numbered', () => {
    expect(detectFormat(opensong)).toBe('opensong');
    expect(detectFormat(beblia)).toBe('beblia');
  });

  it('says nothing about a file that is not a Bible', () => {
    expect(detectFormat('<RVMLDocument><array/></RVMLDocument>')).toBeNull();
    expect(detectFormat('not xml at all')).toBeNull();
  });
});

describe('Zefania', () => {
  const parsed = parseBibleXml(zefania);

  it('takes the name the file gives itself', () => {
    expect(parsed?.name).toBe('Our own edition');
  });

  it('reads the verses and leaves the footnotes out', () => {
    expect(genesis(parsed)?.chapters[0].verses).toEqual([
      [1, 'In the beginning God created.'],
      [2, 'And the earth was & is.'],
    ]);
  });

  it('numbers its books canonically, whatever the app counts in', () => {
    expect(parsed?.books.map(book => book.position)).toEqual([1, 59]);
  });

  it('keeps every chapter', () => {
    expect(genesis(parsed)?.chapters.map(chapter => chapter.number)).toEqual([1, 2]);
  });
});

describe('the <bible> family', () => {
  it('reads a book named in English', () => {
    const parsed = parseBibleXml(opensong);

    expect(parsed?.books.map(book => book.position)).toEqual([1, 66]);
    expect(genesis(parsed)?.chapters[0].verses).toHaveLength(2);
  });

  it('reads a book numbered instead', () => {
    const parsed = parseBibleXml(beblia);

    expect(parsed?.books.map(book => book.position)).toEqual([1, 66]);
    expect(parsed?.books[1].chapters[0]).toEqual({ number: 22, verses: [[21, 'The grace']] });
  });
});

describe('OSIS', () => {
  const parsed = parseBibleXml(osis);

  it('reads a verse that is wrapped', () => {
    expect(genesis(parsed)?.chapters[0].verses).toEqual([
      [1, 'In the beginning God created.'],
      [2, 'And the earth.'],
    ]);
  });

  it('reads a verse that is only marked', () => {
    expect(parsed?.books[1].chapters[0].verses).toEqual([
      [1, 'James, a servant.'],
      [2, 'Count it joy.'],
    ]);
  });

  it('leaves section headings off the screen', () => {
    expect(verseCountOf(parsed!)).toBe(4);
    expect(JSON.stringify(parsed)).not.toContain('heading');
  });
});

describe('USX', () => {
  const parsed = parseBibleXml(usx);

  it('runs a verse on to the next mark, across paragraphs', () => {
    expect(genesis(parsed)?.chapters[0].verses).toEqual([
      [1, 'In the beginning God created.'],
      [2, 'And the earth was without form.'],
    ]);
  });

  it('drops the heading and the footnote', () => {
    expect(JSON.stringify(parsed)).not.toContain('creation');
    expect(JSON.stringify(parsed)).not.toContain('dropped');
  });
});

describe('several files as one Bible', () => {
  it('puts the books back in canonical order', () => {
    const merged = mergeBibles([parseBibleXml(usx)!, parseBibleXml(zefania)!]);

    expect(merged?.books.map(book => book.position)).toEqual([1, 59]);
  });

  it('keeps the fuller copy when a book arrives twice', () => {
    const merged = mergeBibles([parseBibleXml(usx)!, parseBibleXml(opensong)!]);

    expect(genesis(merged)?.chapters[0].verses[0][1]).toBe('In the beginning God created.');
  });

  it('is nothing at all when no file held a book', () => {
    expect(mergeBibles([])).toBeNull();
    expect(parseBibleXml('<bible></bible>')?.books).toEqual([]);
  });
});

describe('the book names a file carries', () => {
  const english = ['Bible', 'Old Testament', 'New Testament', ...Array.from({ length: 66 }, (_, i) => `Book ${i + 1}`)];

  it('takes them from a file that names its books', () => {
    const spanish = `<bible>
      ${Array.from({ length: 66 }, (_, i) => `<b n="${i + 1}" bname="Libro ${i + 1}"><c n="1"><v n="1">x</v></c></b>`).join('')}
    </bible>`;

    const names = bookNamesOf(parseBibleXml(spanish)!, english)!;

    expect(names).toHaveLength(69);
    expect(names[3]).toBe('Libro 1');
    expect(names.slice(0, 3)).toEqual(['Bible', 'Old Testament', 'New Testament']);
  });

  it('reads USX’s running header as the name', () => {
    const parsed = parseBibleXml(usx)!;

    expect(parsed.books[0].name).toBe('Genesis');
  });

  it('refuses a file that names only some of them', () => {
    expect(bookNamesOf(parseBibleXml(zefania)!, english)).toBeNull();
  });

  it('has nothing to take from a file that numbers its books', () => {
    expect(bookNamesOf(parseBibleXml(beblia)!, english)).toBeNull();
  });
});
