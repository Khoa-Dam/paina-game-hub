import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const baseUrl = (__ENV.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const usersPath = __ENV.LOAD_TEST_USERS_JSON;
const gameSlug = __ENV.GAME_SLUG;
const vus = Number(__ENV.VUS || 50);
const duration = __ENV.DURATION || "2m";
const failures = new Rate("request_failures");
const employeeFlow = new Trend("employee_iteration_ms", true);
const authFlow = new Trend("employee_auth_flow_ms", true);
const employeeStatusDuration = new Trend("employee_status_duration", true);
const employeeLoginDuration = new Trend("employee_login_duration", true);
const gameListDuration = new Trend("game_list_duration", true);
const gameDetailDuration = new Trend("game_detail_duration", true);
const sessionStartDuration = new Trend("session_start_duration", true);
const answerDuration = new Trend("answer_duration", true);
const sessionReadDuration = new Trend("session_read_duration", true);
const sessionCompleteDuration = new Trend("session_complete_duration", true);
const targetHostMatch = baseUrl.match(/^https?:\/\/(\[[^\]]+\]|[^/:?#]+)/i);
if (!targetHostMatch) {
  throw new Error("BASE_URL must be an absolute HTTP or HTTPS URL.");
}
const targetHost = targetHostMatch[1].replace(/^\[|\]$/g, "").toLowerCase();

function getJsonField(response, field) {
  if (!response.body) return undefined;
  try {
    return response.json(field);
  } catch {
    return undefined;
  }
}

if (
  targetHost === "paina-game-hub.vercel.app" ||
  targetHost.includes("paina-game-hub-production")
) {
  throw new Error("Production load testing is forbidden.");
}

if (
  !["localhost", "127.0.0.1", "::1"].includes(targetHost) &&
  __ENV.ALLOW_NON_LOCAL_TARGET !== "YES"
) {
  throw new Error(
    "Non-local target blocked. Set ALLOW_NON_LOCAL_TARGET=YES only for an isolated staging environment.",
  );
}

if (!usersPath) {
  throw new Error(
    "Set LOAD_TEST_USERS_JSON to a local file containing staging/local employee credentials.",
  );
}

const users = JSON.parse(open(usersPath));
if (!Array.isArray(users) || users.length < vus) {
  throw new Error(
    `The user file must contain at least VUS (${vus}) distinct employees.`,
  );
}
if (
  users
    .slice(0, vus)
    .some(
      (user) =>
        !user ||
        typeof user.employeeCode !== "string" ||
        typeof user.password !== "string" ||
        !user.employeeCode ||
        !user.password,
    )
) {
  throw new Error("Every test user needs an employeeCode and password.");
}
const employeeCodes = users.slice(0, vus).map((user) => user.employeeCode);
if (new Set(employeeCodes).size !== vus) {
  throw new Error("Each virtual user must have a distinct employeeCode.");
}

export const options = {
  noCookiesReset: true,
  scenarios: {
    employee_traffic: {
      executor: "constant-vus",
      vus,
      duration,
      gracefulStop: "15s",
    },
  },
  thresholds: {
    request_failures: ["rate<0.01"],
    http_req_duration: ["p(95)<2500"],
    employee_auth_flow_ms: ["p(95)<2500"],
  },
};

let authenticated = false;

export default function () {
  const user = users[__VU - 1];
  const startedAt = Date.now();
  if (!authenticated) {
    const authStartedAt = Date.now();
    const statusResponse = http.post(
      `${baseUrl}/api/auth/employee-status`,
      JSON.stringify({ employeeCode: user.employeeCode }),
      { headers: { "Content-Type": "application/json" } },
    );
    employeeStatusDuration.add(statusResponse.timings.duration);
    const statusOk = check(statusResponse, {
      "employee status returns 200": (response) => response.status === 200,
    });
    failures.add(!statusOk);
    if (!statusOk) return;

    const accountState = statusResponse.json("status");
    const accountReady = accountState === "LOGIN";
    check(statusResponse, {
      "employee account has a password": () => accountReady,
    });
    failures.add(!accountReady);
    if (!accountReady) {
      console.error(
        `VU ${__VU}: account state is ${accountState || "unknown"}; a registered account with a password is required.`,
      );
      sleep(5);
      return;
    }

    const loginResponse = http.post(
      `${baseUrl}/api/auth/employee-login`,
      JSON.stringify({
        employeeCode: user.employeeCode,
        password: user.password,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
    employeeLoginDuration.add(loginResponse.timings.duration);
    const loginOk = check(loginResponse, {
      "employee login returns 200": (response) => response.status === 200,
    });
    failures.add(!loginOk);
    if (!loginOk) {
      const loginError = getJsonField(loginResponse, "error");
      console.error(
        `VU ${__VU}: login failed with HTTP ${loginResponse.status || "network error"}${loginError ? `: ${loginError}` : "."}`,
      );
      sleep(5);
      return;
    }

    const sessionCookie = loginResponse.cookies.paina_session?.[0];
    const hasSessionCookie = Boolean(sessionCookie?.value);
    check(loginResponse, {
      "employee login sets a session cookie": () => hasSessionCookie,
    });
    failures.add(!hasSessionCookie);
    if (!hasSessionCookie) {
      sleep(5);
      return;
    }

    const isLocalHttpTarget =
      baseUrl.startsWith("http://") &&
      ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(
        targetHost,
      );
    if (isLocalHttpTarget && sessionCookie.secure) {
      http.cookieJar().set(baseUrl, "paina_session", sessionCookie.value, {
        domain: targetHost,
        path: "/",
        secure: false,
      });
    }

    authenticated = true;
    authFlow.add(Date.now() - authStartedAt);
  }

  const gamesResponse = http.get(`${baseUrl}/api/games`);
  gameListDuration.add(gamesResponse.timings.duration);
  const gamesOk = check(gamesResponse, {
    "game list returns 200": (response) => response.status === 200,
  });
  failures.add(!gamesOk);
  if (!gamesOk && __ITER === 0) {
    const gamesError = getJsonField(gamesResponse, "error");
    console.error(
      `VU ${__VU}: game list failed with HTTP ${gamesResponse.status || "network error"}${gamesError ? `: ${gamesError}` : "."}`,
    );
  }

  if (gameSlug) {
    const gameResponse = http.get(`${baseUrl}/api/games/${gameSlug}`);
    gameDetailDuration.add(gameResponse.timings.duration);
    const gameOk = check(gameResponse, {
      "game detail returns 200": (response) => response.status === 200,
    });
    failures.add(!gameOk);

    if (gameOk && __ITER === 0) {
      const game = gameResponse.json("game");
      const sessionResponse = http.post(
        `${baseUrl}/api/sessions/start`,
        JSON.stringify({ gameId: game.id }),
        { headers: { "Content-Type": "application/json" } },
      );
      sessionStartDuration.add(sessionResponse.timings.duration);
      const sessionStarted = check(sessionResponse, {
        "game session starts": (response) => response.status === 200,
      });
      failures.add(!sessionStarted);

      if (sessionStarted) {
        const sessionId = sessionResponse.json("sessionId");
        const questions = getJsonField(sessionResponse, "questions") || [];
        const hasQuestions = Array.isArray(questions) && questions.length > 0;
        check(sessionResponse, {
          "game session includes questions": () => hasQuestions,
        });
        failures.add(!hasQuestions);

        if (hasQuestions) {
          for (const question of questions) {
            let answer;
            if (question.type === "QUIZ" || question.type === "TRUE_FALSE") {
              answer = { selectedIndex: 0 };
            } else if (question.type === "PICTURE_GUESSING") {
              answer = { answerText: "k6-load-test" };
            } else if (
              question.type === "WORD_PUZZLE" &&
              Array.isArray(question.scrambledTokens)
            ) {
              answer = { orderedTokens: question.scrambledTokens };
            }

            if (!answer) {
              failures.add(true);
              continue;
            }

            const answerResponse = http.post(
              `${baseUrl}/api/sessions/${sessionId}/answer`,
              JSON.stringify({ questionId: question.id, ...answer }),
              { headers: { "Content-Type": "application/json" } },
            );
            answerDuration.add(answerResponse.timings.duration);
            const answerOk = check(answerResponse, {
              "question answer is accepted": (response) =>
                response.status === 200,
            });
            failures.add(!answerOk);
          }
        }

        const sessionReadResponse = http.get(
          `${baseUrl}/api/sessions/${sessionId}`,
        );
        sessionReadDuration.add(sessionReadResponse.timings.duration);
        const sessionReadOk = check(sessionReadResponse, {
          "game session loads": (response) => response.status === 200,
        });
        failures.add(!sessionReadOk);

        const completeResponse = http.post(
          `${baseUrl}/api/sessions/${sessionId}/complete`,
          null,
        );
        sessionCompleteDuration.add(completeResponse.timings.duration);
        const completeOk = check(completeResponse, {
          "game session completes": (response) => response.status === 200,
        });
        failures.add(!completeOk);
      }
    }
  }

  employeeFlow.add(Date.now() - startedAt);
  sleep(1);
}
