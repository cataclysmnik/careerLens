// lib/jobs/basic-jd.ts
// Standard basic job descriptions for target roles, used when a candidate
// doesn't provide a custom JD or wants a realistic role baseline.

export const BASIC_ROLE_JDS: Record<string, string> = {
  'frontend developer': `Role: Frontend Developer
Overview:
We are seeking a Frontend Developer to build clean, responsive, and performant user interfaces for our web applications. You will collaborate closely with product designers and backend engineers to deliver smooth customer experiences.

Key Responsibilities:
- Build modular, accessible UI components using React, Next.js, and TypeScript.
- Optimize frontend web vitals, bundle size, and client-side rendering speed.
- Integrate RESTful and GraphQL APIs with robust error handling and loading states.
- Implement responsive CSS layouts, animations, and cross-browser compatibility.
- Write unit and component tests to ensure high code quality.

Requirements:
- Strong proficiency in modern JavaScript (ES6+), TypeScript, HTML5, and CSS.
- Hands-on experience with React and state management patterns.
- Familiarity with Git, responsive web design, and browser debugging tools.
- Understanding of web security best practices (XSS, CSRF mitigation).`,

  'backend developer': `Role: Backend Developer
Overview:
We are looking for a Backend Developer to design, build, and scale resilient server-side services and database architectures. You will own the core business logic, API integrations, and database performance.

Key Responsibilities:
- Design and implement scalable RESTful APIs and microservices.
- Model relational database schemas and optimize SQL queries, indexing, and transactions.
- Implement caching layers (Redis) and asynchronous background job queues.
- Ensure data security, user authentication (JWT/OAuth), and system reliability.
- Set up logging, error monitoring, and observability for production services.

Requirements:
- Strong proficiency in Node.js, Python, Java, or Go.
- Solid experience with relational databases (PostgreSQL, MySQL) and ORMs.
- Understanding of concurrency, caching strategies, and API security.
- Experience with Docker, Git, and automated testing.`,

  'full stack developer': `Role: Full Stack Developer
Overview:
We are seeking a versatile Full Stack Developer to own end-to-end features from database architecture to user-facing interfaces. You will work across the entire product lifecycle to build reliable, high-impact features.

Key Responsibilities:
- Architect and develop scalable web applications across the entire stack.
- Build interactive, responsive client interfaces using React and modern CSS.
- Design backend REST APIs, authentication flows, and database schemas.
- Implement caching, database optimization, and third-party API integrations.
- Deploy, monitor, and maintain services in staging and production environments.

Requirements:
- Proficiency in JavaScript/TypeScript across both frontend and backend.
- Experience with React, Node.js/Express, and SQL or NoSQL databases.
- Strong understanding of RESTful API design, state management, and Git workflows.
- Ability to make practical technical trade-offs between speed and scalability.`,

  'data scientist / ml engineer': `Role: Data Scientist / Machine Learning Engineer
Overview:
We are looking for a Data Scientist / ML Engineer to analyze complex datasets, build predictive models, and deploy production-ready machine learning solutions.

Key Responsibilities:
- Clean, preprocess, and perform exploratory data analysis on structured and unstructured datasets.
- Develop, evaluate, and tune machine learning models for accuracy and business impact.
- Build data processing pipelines and feature engineering workflows.
- Deploy models as REST inference APIs and monitor performance against data drift.
- Collaborate with engineering teams to integrate ML insights into core applications.

Requirements:
- Strong proficiency in Python and data science libraries (pandas, NumPy, scikit-learn).
- Familiarity with deep learning frameworks (PyTorch or TensorFlow).
- Experience with SQL and relational database queries.
- Solid understanding of statistical analysis, evaluation metrics, and model validation.`,

  'devops / cloud engineer': `Role: DevOps / Cloud Engineer
Overview:
We are seeking a DevOps / Cloud Engineer to manage our cloud infrastructure, automate deployment pipelines, and ensure high system availability, security, and scalability.

Key Responsibilities:
- Build and maintain automated CI/CD pipelines for testing and zero-downtime deployments.
- Manage containerized environments using Docker and orchestration tools (Kubernetes).
- Provision and maintain cloud resources (AWS, GCP, or Azure) using Infrastructure as Code.
- Monitor system metrics, configure alerting, and lead incident response.
- Implement security best practices, access controls, and backup recovery procedures.

Requirements:
- Experience with cloud platforms (AWS, GCP, Azure) and Linux systems administration.
- Hands-on expertise with Docker, container management, and CI/CD tools.
- Proficiency in shell scripting (Bash) and Python.
- Understanding of networking protocols, load balancing, and cloud security.`,

  'mobile developer': `Role: Mobile Application Developer
Overview:
We are looking for a Mobile Developer to design and build high-performance mobile applications with seamless user interfaces.

Key Responsibilities:
- Develop and maintain native or cross-platform mobile applications.
- Integrate RESTful APIs and ensure reliable offline data synchronization.
- Optimize app performance, memory consumption, and battery usage.
- Ensure app store compliance and lead release management.

Requirements:
- Experience with Kotlin/Java for Android, Swift for iOS, or Flutter / React Native.
- Strong understanding of mobile UI/UX guidelines and responsive layout principles.
- Experience with local mobile storage, state management, and Git.`,

  'qa engineer': `Role: QA / Automation Engineer
Overview:
We are looking for a QA Engineer to design test frameworks, automate regression suites, and ensure software reliability across releases.

Key Responsibilities:
- Design detailed test plans, test cases, and acceptance criteria.
- Build and execute automated end-to-end tests for web applications and APIs.
- Identify, document, and track software bugs through resolution.
- Integrate automated tests into continuous integration pipelines.

Requirements:
- Experience with test automation frameworks (Playwright, Cypress, Selenium, or Jest).
- Strong understanding of REST API testing and testing methodologies.
- Proficiency in JavaScript, TypeScript, or Python.`,

  'android developer': `Role: Android Developer
Overview:
We are looking for a dedicated Android Developer to build and enhance our mobile applications for millions of Android users.

Key Responsibilities:
- Design and build advanced applications for the Android platform.
- Collaborate with cross-functional teams to define, design, and ship new features.
- Work with outside data sources and APIs.
- Unit-test code for robustness, including edge cases, usability, and general reliability.

Requirements:
- Strong knowledge of Android SDK, different versions of Android, and how to deal with different screen sizes.
- Familiarity with RESTful APIs to connect Android applications to back-end services.
- Strong knowledge of Android UI design principles, patterns, and best practices.
- Proficient in Kotlin and Java.`,

  'cloud engineer': `Role: Cloud Engineer
Overview:
We are seeking a Cloud Engineer to architect, build, and optimize scalable, reliable cloud infrastructure and services.

Key Responsibilities:
- Architect cloud solutions on AWS, Azure, or Google Cloud.
- Automate deployment of infrastructure using Terraform or CloudFormation.
- Optimize cloud expenditure and system performance.
- Ensure security and compliance across cloud environments.

Requirements:
- Experience with AWS, Azure, or GCP services.
- Knowledge of Infrastructure as Code (Terraform), Docker, and Linux.
- Understanding of networking, VPCs, IAM, and security compliance.`,

  'machine learning engineer': `Role: Machine Learning Engineer
Overview:
We are seeking a Machine Learning Engineer to take models from research to scalable production deployment.

Key Responsibilities:
- Implement ML algorithms and neural networks for computer vision, NLP, or recommendations.
- Optimize model latency, memory footprint, and batch inference throughput.
- Build automated pipelines for model retraining and validation.
- Collaborate with software engineers to integrate models into microservices.

Requirements:
- Strong Python skills and expertise in PyTorch or TensorFlow.
- Experience with model serving, Docker, and REST APIs.
- Solid background in data structures, algorithms, and linear algebra.`,
};

/**
 * Returns a realistic basic job description for any target role.
 * If the role matches a known preset, returns the curated description;
 * otherwise generates a clean, structured baseline JD for that role title.
 */
export function getBasicJobDescription(roleTitle: string): string {
  const norm = roleTitle.trim().toLowerCase();

  // Exact or alias match
  for (const [key, jd] of Object.entries(BASIC_ROLE_JDS)) {
    if (norm === key || norm.includes(key) || key.includes(norm)) {
      return jd;
    }
  }

  // Dynamic fallback for custom roles
  const capitalized = roleTitle.trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return `Role: ${capitalized}
Overview:
We are looking for a qualified ${capitalized} to join our engineering team. In this role, you will apply core engineering principles and modern best practices to deliver reliable, production-grade solutions.

Key Responsibilities:
- Design, implement, and maintain high-quality software solutions and workflows.
- Collaborate with product and engineering team members to translate business goals into technical specifications.
- Write clean, maintainable code with comprehensive documentation and tests.
- Identify system bottlenecks, troubleshoot bugs, and implement performance optimizations.
- Follow modern version control, code review, and continuous delivery practices.

Requirements:
- Practical experience with modern software engineering tools and languages relevant to ${capitalized}.
- Solid understanding of data structures, algorithms, and system design principles.
- Experience with Git, API integrations, and database operations.
- Strong communication, problem-solving skills, and a commitment to code quality.`;
}
