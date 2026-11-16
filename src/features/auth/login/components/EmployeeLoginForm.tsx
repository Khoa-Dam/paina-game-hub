"use client";

import Pineapple from "@/components/Pineapple";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../constants";
import { useEmployeeLogin } from "../hooks/useEmployeeLogin";

export default function EmployeeLoginForm() {
  const login = useEmployeeLogin();
  const isRegistration = login.accountState === "NEW";

  return (
    <main className="relative flex min-h-screen items-start justify-center overflow-x-hidden bg-paper px-4 py-8 sm:py-10">
      <div className="blob -left-20 -top-20 h-72 w-72 bg-lime-200" />
      <div className="blob -right-16 top-10 h-60 w-60 bg-pink-200" />
      <div className="blob bottom-0 left-1/4 h-64 w-64 bg-sky-200" />
      <div className="relative w-full max-w-lg">
        <header className="mb-8 text-center">
          <Pineapple className="mx-auto mb-2 h-16 w-16" bounce />
          <h1
            className="font-heading text-4xl font-bold tracking-wide text-ink"
            style={{ textShadow: "3px 3px 0 #FFC93C" }}
          >
            PAINA GAME HUB
          </h1>
          <p className="mt-2 font-body text-sm text-muted">
            Đăng ký lần đầu hoặc đăng nhập để vào chơi nhé! 🎮
          </p>
        </header>

        <form
          onSubmit={
            login.accountState
              ? login.submitCredentials
              : login.checkEmployeeCode
          }
          className="card space-y-5 sm:p-7"
        >
          <div>
            <label className="label" htmlFor="employeeCode">
              Mã nhân viên
            </label>
            <input
              id="employeeCode"
              className="input"
              value={login.employeeCode}
              onChange={(event) => login.changeEmployeeCode(event.target.value)}
              placeholder="NV0001"
              autoComplete="username"
              required
            />
          </div>

          {!login.accountState && (
            <button
              type="submit"
              disabled={login.loading}
              className="btn-primary w-full"
            >
              {login.loading ? "Đang kiểm tra..." : "Tiếp tục"}
            </button>
          )}

          {isRegistration && <RegistrationFields login={login} />}

          {login.accountState === "LOGIN" && (
            <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">
              Nhập mật khẩu để đăng nhập.
            </p>
          )}
          {login.accountState === "PASSWORD_REQUIRED" && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              Tài khoản này cần thiết lập mật khẩu lần đầu. Vui lòng liên hệ
              Admin để nhận link đặt mật khẩu.
            </p>
          )}

          {(login.accountState === "NEW" || login.accountState === "LOGIN") && (
            <PasswordFields login={login} isRegistration={isRegistration} />
          )}

          {login.accountState && (
            <button
              type="button"
              className="w-full text-sm text-muted underline"
              onClick={login.resetAccountState}
            >
              Đổi mã nhân viên
            </button>
          )}
          {login.error && (
            <p className="text-sm font-medium text-pink-600" role="alert">
              {login.error}
            </p>
          )}
          <p className="text-center text-xs text-muted">
            Là Admin?{" "}
            <a href="/admin/login" className="font-semibold text-ink underline">
              Đăng nhập quản trị
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}

function RegistrationFields({
  login,
}: {
  login: ReturnType<typeof useEmployeeLogin>;
}) {
  return (
    <>
      <p className="rounded-xl bg-lime-50 p-3 text-sm text-lime-800">
        Mã chưa có tài khoản. Điền thông tin để đăng ký.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fullName">
            Họ và tên
          </label>
          <input
            id="fullName"
            className="input"
            autoComplete="name"
            value={login.form.fullName}
            onChange={(event) =>
              login.updateForm("fullName", event.target.value)
            }
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="departmentId">
            Phòng ban
          </label>
          <select
            id="departmentId"
            className="input"
            value={login.form.departmentId}
            onChange={(event) =>
              login.updateForm("departmentId", event.target.value)
            }
            required
          >
            <option value="">Chọn phòng ban</option>
            {login.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.code ? `${department.code} · ` : ""}
                {department.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

function PasswordFields({
  login,
  isRegistration,
}: {
  login: ReturnType<typeof useEmployeeLogin>;
  isRegistration: boolean;
}) {
  return (
    <>
      <div className={isRegistration ? "grid gap-4 sm:grid-cols-2" : undefined}>
        <div>
          <label className="label" htmlFor="password">
            {isRegistration ? "Đặt mật khẩu" : "Mật khẩu"}
          </label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete={isRegistration ? "new-password" : "current-password"}
            value={login.form.password}
            onChange={(event) =>
              login.updateForm("password", event.target.value)
            }
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            required
          />
          {isRegistration && (
            <p className="mt-1 text-xs text-muted">
              Mật khẩu dài tối thiểu {PASSWORD_MIN_LENGTH} ký tự.
            </p>
          )}
        </div>
        {isRegistration && (
          <div>
            <label className="label" htmlFor="passwordConfirmation">
              Nhập lại mật khẩu
            </label>
            <input
              id="passwordConfirmation"
              className="input"
              type="password"
              autoComplete="new-password"
              value={login.form.passwordConfirmation}
              onChange={(event) =>
                login.updateForm("passwordConfirmation", event.target.value)
              }
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              required
            />
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={login.loading}
        className="btn-primary w-full"
      >
        {login.loading
          ? "Đang xử lý..."
          : isRegistration
            ? "Tạo tài khoản"
            : "Đăng nhập"}
      </button>
    </>
  );
}
