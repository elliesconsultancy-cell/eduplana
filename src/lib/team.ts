/**
 * The people on the About page.
 *
 * Kept as data, apart from the layout, so a bio or a photograph can be changed
 * without touching the page. Portraits are 900×900 WebP in `public/team/`, cropped
 * square so the four sit together.
 *
 * Bios are written from the ones each person supplied: tightened, put in the
 * third person throughout, and with nothing added. Pronouns appear only where
 * the person's own text used them.
 */
export interface Person {
  /** Used for the profile's anchor: /about#<slug>. */
  slug: string;
  name: string;
  role: string;
  group: "co-founder" | "leadership";
  photo: string;
  /** One sentence, for search engines and link previews. */
  summary: string;
  /** The first two are shown; the rest sit behind "Read the full profile". */
  paragraphs: string[];
  expertise: string[];
  workedWith?: string[];
}

export const TEAM: Person[] = [
  {
    slug: "oriyomi-ogunwale",
    name: "Oriyomi Ogunwale",
    role: "Co-Founder & Team Lead",
    group: "co-founder",
    photo: "/team/oriyomi-ogunwale.webp",
    summary:
      "Co-founded Eduplana in 2017 as a civic tech organisation promoting accountability and transparency in Nigeria's education sector, and leads the team.",
    paragraphs: [
      "Oriyomi Ogunwale co-founded Eduplana in 2017, a civic tech organisation that promotes accountability and transparency in the education sector, and leads the team today.",
      "Oriyomi has led Eduplana on civic projects that give citizens access to education governance and help them understand how public education works, through information gathering, civic action and campaigning for change. A champion for accountability and transparency in Nigeria's education sector, Oriyomi's background is in data processing and management, behavioural science, management consulting, and project development and management.",
      "Those projects include Education Financing Advocacy, Public School Needs Assessment, Education Policy Reform, Teachers' Welfare, Universities' Autonomy and States Education Funding. The major advocacy campaigns include #EducationFund, #SaveLautech, #StudentInjustice and #OutofSchoolChildren. Eduplana's education infographics have been published in newspapers, and the team partners with radio stations.",
      "Oriyomi is a member of the Open Data Team and Open Alliance in Nigeria, which work to improve openness and accountability in government.",
      "Oriyomi is a graduate of Animal Nutrition from the Federal University of Agriculture, Abeokuta (FUNAAB), where Oriyomi was a member of AIESEC Abeokuta and JCIN FUNAAB and served as the 2010 Vice-President of JCIN FUNAAB. Oriyomi is also a graduate of Non-Profit Leadership and Management from Lagos Business School.",
    ],
    expertise: ["Management consulting", "Data processing & management", "Behavioural science", "Project development", "Education advocacy"],
    workedWith: ["BudgIT", "EiE Nigeria", "IBP", "Malala Fund", "OGP", "USAID SACE"],
  },
  {
    slug: "babatunde-adegbite",
    name: "Babatunde Adegbite",
    role: "Co-Founder & Chief Technology Officer",
    group: "co-founder",
    photo: "/team/babatunde-adegbite.webp",
    summary:
      "Co-founder and CTO of Eduplana, a software engineer of more than ten years who builds the platform that puts education data in the hands of parents, schools and policymakers.",
    paragraphs: [
      "Tunde believes every child deserves a fair shot at a good education, and that the first step to fixing a problem is being able to see it clearly.",
      "That conviction led him to co-found Eduplana, which began as an NGO using data visualisation to advocate for better education in Nigeria. By turning raw numbers into stories that policymakers, schools and communities could understand, Eduplana made the case for change impossible to ignore. Today, Tunde is building that mission into a platform designed to help educators, parents and organisations plan, track and improve learning outcomes.",
      "He brings rare depth to the work. Over more than ten years as a software engineer, Tunde has designed and built products for businesses and users across Nigeria, the United States, Spain and the United Kingdom, from consumer platforms to complex enterprise tools. He currently leads engineering initiatives at a technology company building AI-powered products.",
      "His path into tech was not a straight line. He holds a degree in Chemistry from the Federal University of Agriculture, Abeokuta, and built his engineering career through determination and self-teaching. That journey drives his commitment to opening doors for others: in the United Kingdom he volunteers his time helping refugees and people from low-income backgrounds build the skills to start careers in tech, and he mentors many young developers as they grow in confidence and craft.",
      "Beyond technology, Tunde is a leader at The Elevation Church UK, where he serves and strengthens the community. He lives in Greater Manchester.",
      "At Eduplana, his goal is simple: put clear, honest data in the hands of the people shaping children's futures, and give them the tools to act on it.",
    ],
    expertise: ["Software engineering", "AI-powered products", "Mentoring", "Data visualisation"],
  },
  {
    slug: "tomiwa-anjorin",
    name: "Tomiwa Anjorin",
    role: "Head, Strategy & Partnerships",
    group: "leadership",
    photo: "/team/tomiwa-anjorin.webp",
    summary:
      "Management consultant who leads strategy and partnerships at Eduplana, with experience building strategy and performance management systems for public and private organisations.",
    paragraphs: [
      "Tomiwa Anjorin is a management consultant with skills in organisational strategy, performance management, process improvement and organisational development.",
      "He has held several advisory roles in which he developed corporate and business-unit strategies, drove strategy implementation through integrated performance management systems, and built empirical employee performance appraisal systems. He has led the deployment of strategy and performance management systems for organisations in both the public and private sectors.",
      "As a training facilitator, he has delivered many hours of training on strategy, performance management, design thinking, creativity, innovation and problem solving to clients across sectors and industries.",
      "He previously worked in the public sector as Special Assistant to the Director-General of the Lagos State Emergency Management Agency (LASEMA). He currently works with Knewrow as Head, Advisory Services, where he leads strategy and performance management projects.",
      "Tomiwa holds a bachelor's degree from the Federal University of Technology, Akure. He is an Associate member of the Chartered Institute of Personnel Management (CIPM) and a Certified Strategy and KPI professional.",
    ],
    expertise: ["Organisational strategy", "Performance management", "Process improvement", "Training & facilitation"],
    workedWith: [
      "Central Bank of Nigeria",
      "Department of Petroleum Resources",
      "Lagos State Government",
      "Unity Bank",
      "Matrix Energy",
      "Meggawatts Engineering",
      "Enikkom Construction",
      "Afrinvest",
      "CIPM",
    ],
  },
  {
    slug: "olufunlola-adeola",
    name: "Olufunlola Adeola",
    role: "Digital Communication Lead",
    group: "leadership",
    photo: "/team/olufunlola-adeola.webp",
    summary:
      "Social media manager and UI/UX designer who leads Eduplana's Digital Communication team, shaping the brand's online presence and community engagement.",
    paragraphs: [
      "Olufunlola Adeola is a Social Media Manager and UI/UX designer with five years of experience helping brands build a strong digital presence.",
      "With a passion for creating engaging content and intuitive user experiences, Olufunlola has worked across industries, managing social media strategies and designing user-friendly digital products. Olufunlola now leads the Digital Communication team at Eduplana, shaping the brand's online presence and community engagement.",
      "Olufunlola has helped businesses grow their digital reach while keeping their brand consistent, and has been an active volunteer since 2018, contributing expertise to a range of initiatives. A graduate of the Federal University of Agriculture, Abeokuta (FUNAAB), Olufunlola brings hands-on experience in digital communication and design to the team.",
    ],
    expertise: ["Social media strategy", "UI/UX design", "Content & community", "Brand consistency"],
  },
];
