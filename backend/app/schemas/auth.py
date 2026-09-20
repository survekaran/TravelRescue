from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class AuthRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    @field_validator("email", check_fields=False)
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return value.lower()


class RegisterRequest(AuthRequest):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=12, max_length=72)


class LoginRequest(AuthRequest):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
