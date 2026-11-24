import type { LiveProgramId } from "./live-origin";

export type Program = {
  id: LiveProgramId;
  name: string;
  blurb: string;
};

export type Section = {
  id: string;
  name: string;
  kicker: string;
  blurb: string;
  programs: Program[];
};

export const sections: Section[] = [
  {
    id: "study",
    name: "自我提升",
    kicker: "学习",
    blurb: "考试和读书。",
    programs: [
      {
        id: "exam",
        name: "考试",
        blurb: "监考发布试卷，考生填写姓名后作答。",
      },
      {
        id: "reading",
        name: "读书",
        blurb: "在手机上阅读、做笔记、交流心得。",
      },
    ],
  },
  {
    id: "joy",
    name: "欢乐空间",
    kicker: "轻松",
    blurb: "性格测试和团建转盘。",
    programs: [
      {
        id: "mbti",
        name: "MBTI职场性格测试游戏",
        blurb: "入职性格倾向测评。",
      },
      {
        id: "wheel",
        name: "团建幸运大转盘",
        blurb: "每人转一次，票数最高的团建活动胜出。",
      },
    ],
  },
];

export function sectionById(id: string): Section | undefined {
  return sections.find((section) => section.id === id);
}

export function programById(id: string): { section: Section; program: Program } | undefined {
  for (const section of sections) {
    const program = section.programs.find((item) => item.id === id);
    if (program) return { section, program };
  }
  return undefined;
}