$ErrorActionPreference = 'Stop'
$path = 'src\components\work\case-study\CaseStudyWindow.tsx'
$t = [IO.File]::ReadAllText($path).Replace("`r`n", "`n")
$log = @()

function Swap([string]$name, [string]$old, [string]$new) {
  $script:hitOld = $old
  if ($script:t.Contains($old)) {
    $script:t = $script:t.Replace($old, $new)
    $script:log += "OK   $name"
  } else {
    $script:log += "MISS $name"
  }
}

$a_old = @'
  CASE_STUDY_SECTIONS,
  CASE_STUDY_SURFACE,
'@
$a_new = @'
  CASE_STUDY_SECTIONS,
  CASE_STUDY_TABS,
  SECTION_TAB,
  CASE_STUDY_SURFACE,
'@
Swap 'imports' $a_old $a_new

$b_old = @'
  type CaseStudySectionId,
'@
$b_new = @'
  type CaseStudySectionId,
  type CaseStudyTabId,
'@
Swap 'type-import' $b_old $b_new

$c_old = "useState<CaseStudySectionId>('cover')"
$c_new = "useState<CaseStudyTabId>('cover')"
Swap 'active-state' $c_old $c_new

$d_old = @'
          const id = entry.target.getAttribute('data-section');
          if (id) setActive(id as CaseStudySectionId);
'@
$d_new = @'
          /* EIGHT SECTIONS, FOUR TABS. The observer watches the document's
             sections, because those are what a reader is actually inside. The
             pill only has room for four stops, so the section holding the
             middle of the window is mapped up to the tab that covers it -
             which is why adding a ninth section never touches this file. */
          const id = entry.target.getAttribute('data-section') as
            | CaseStudySectionId
            | null;
          if (id && SECTION_TAB[id]) setActive(SECTION_TAB[id]);
'@
Swap 'observer' $d_old $d_new

$e_old = @'
    const cover = scroller?.querySelector<HTMLElement>('[data-section="cover"]');
'@
$e_new = @'
    /* The hero, by position rather than by name: the first section in the
       running order is the cover, whatever it ends up being called. */
    const cover = scroller?.querySelector<HTMLElement>(
      `[data-section="${CASE_STUDY_SECTIONS[0].id}"]`
    );
'@
Swap 'parallax-selector' $e_old $e_new

$f_old = @'
  const goToSection = (id: CaseStudySectionId) => {
    const scroller = scrollerRef.current;
    const target = scroller?.querySelector<HTMLElement>(`[data-section="${id}"]`);
'@
$f_new = @'
  const goToSection = (tabId: CaseStudyTabId) => {
    const scroller = scrollerRef.current;
    /* A tab scrolls to the FIRST section of its group - the `target` on the tab
       record - rather than to a section that shares its name, because three of
       the four tabs cover more than one section. */
    const id =
      CASE_STUDY_TABS.find((tab) => tab.id === tabId)?.target ??
      CASE_STUDY_SECTIONS[0].id;
    const target = scroller?.querySelector<HTMLElement>(`[data-section="${id}"]`);
'@
Swap 'goToSection' $f_old $f_new

$g_old = @'
              {CASE_STUDY_SECTIONS.map((section) => {
                const isActive = active === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className="case-study__tab"
                    data-active={isActive ? 'true' : 'false'}
                    onClick={() => goToSection(section.id)}
'@
$g_new = @'
              {CASE_STUDY_TABS.map((tab) => {
                const isActive = active === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className="case-study__tab"
                    data-active={isActive ? 'true' : 'false'}
                    onClick={() => goToSection(tab.id)}
'@
Swap 'tab-render' $g_old $g_new

$h_old = '<RollLabel text={section.label} />'
$h_new = '<RollLabel text={tab.label} />'
Swap 'tab-label' $h_old $h_new

[IO.File]::WriteAllText($path, $t, (New-Object Text.UTF8Encoding($false)))
$log += "bytes: " + (Get-Item $path).Length
$log | Out-File -Encoding ascii patchlog.txt
