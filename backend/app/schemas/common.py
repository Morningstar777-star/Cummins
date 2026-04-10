from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class AppBaseModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)


class RegisterRequest(AppBaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str):
        allowed = set("0123456789+ -()")
        if any(ch not in allowed for ch in value):
            raise ValueError("Phone can only include digits and + - ( ) characters.")
        return value

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str):
        # bcrypt only supports passwords up to 72 bytes.
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes in UTF-8.")
        return value


class LoginRequest(AppBaseModel):
    email: EmailStr | None = None
    identifier: str | None = Field(default=None, min_length=2, max_length=120)
    password: str = Field(min_length=1, max_length=128)

    @model_validator(mode="after")
    def validate_identifier_or_email(self):
        if not self.email and not self.identifier:
            raise ValueError("Either email or identifier is required.")
        return self


class ProfileUpdateRequest(AppBaseModel):
    aesthetic_style: Literal[
        "Minimalistic",
        "Modern",
        "Industrial",
        "Maximalistic",
        "Traditional",
        "Vintage / Art Deco",
        "Cottagecore",
    ] | None = None
    mood_feel: Literal[
        "Cosy & Inviting",
        "Sleek & Modern",
        "Serene & Calm",
        "Rustic & Warm",
        "Luxurious & Opulent",
        "Natural & Organic",
    ] | None = None
    budget: Literal["Budget", "Standard", "Premium", "Luxury"] | None = None
    project: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_at_least_one_field(self):
        if all(
            value is None
            for value in (self.aesthetic_style, self.mood_feel, self.budget, self.project)
        ):
            raise ValueError("At least one profile field is required.")
        return self


class TokenResponse(AppBaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "customer"


class QuizSubmitRequest(AppBaseModel):
    aesthetic_style: str = Field(min_length=2, max_length=80)
    mood_feel: str = Field(min_length=2, max_length=80)
    budget_value: int = Field(ge=0, le=10000)
    extra_preferences: str = Field(default="", max_length=2000)


class ChatRequest(AppBaseModel):
    message: str = Field(min_length=1, max_length=2000)


class AnalyzeImageRequest(AppBaseModel):
    image_base64: str = Field(min_length=10)


class AddCartItemRequest(AppBaseModel):
    product_id: str = Field(min_length=2, max_length=80)
    qty: int = Field(ge=1, le=10)


class UpdateCartItemRequest(AppBaseModel):
    qty: int = Field(ge=1, le=20)


class DemoPaymentConfirmRequest(AppBaseModel):
    payment_id: str = Field(min_length=4, max_length=120)
