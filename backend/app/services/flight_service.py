from datetime import date

import httpx

from app.core.config import settings


class FlightService:
    """
    Service for retrieving and normalizing real-time flight information
    from Aviationstack.
    """

    BASE_URL = "https://api.aviationstack.com/v1/flights"

    async def get_flight_status(
        self,
        flight_number: str,
        flight_date: date | None = None,
        departure_iata: str | None = None,
        arrival_iata: str | None = None,
    ) -> dict | None:
        """
        Retrieve a flight and return the matching flight record.

        Aviationstack is queried only by flight number.
        Date and route matching are performed locally.
        """

        if settings.AVIATIONSTACK_API_KEY is None:
            # Configuration details stay server-side; callers receive a generic
            # monitoring failure from the router.
            raise RuntimeError("Flight provider is not configured")

        params = {
            "access_key": settings.AVIATIONSTACK_API_KEY.get_secret_value(),
            "flight_iata": flight_number,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                self.BASE_URL,
                params=params,
            )

        response.raise_for_status()

        data = response.json()
        flights = data.get("data", [])

        if not flights:
            return None

        matching_flights = flights

        # Filter by flight date locally.
        if flight_date is not None:
            target_date = flight_date.isoformat()

            matching_flights = [
                flight
                for flight in matching_flights
                if flight.get("flight_date") == target_date
            ]

        # Filter by departure airport locally.
        if departure_iata is not None:
            matching_flights = [
                flight
                for flight in matching_flights
                if (flight.get("departure") or {}).get("iata")
                == departure_iata
            ]

        # Filter by arrival airport locally.
        if arrival_iata is not None:
            matching_flights = [
                flight
                for flight in matching_flights
                if (flight.get("arrival") or {}).get("iata")
                == arrival_iata
            ]

        if not matching_flights:
            return None

        # The combination of flight number + date + route
        # should identify one real flight occurrence.
        if len(matching_flights) > 1:
            raise ValueError(
                f"Multiple matching flights found for {flight_number}. "
                "More specific flight information is required."
            )

        flight = matching_flights[0]

        departure = flight.get("departure") or {}
        arrival = flight.get("arrival") or {}
        airline = flight.get("airline") or {}
        flight_info = flight.get("flight") or {}

        return {
            "flight_number": flight_info.get("iata") or flight_number,
            "flight_date": flight.get("flight_date"),
            "status": flight.get("flight_status"),
            "airline": airline.get("name"),
            "departure_airport": departure.get("iata"),
            "arrival_airport": arrival.get("iata"),
            "scheduled_departure": departure.get("scheduled"),
            "estimated_departure": departure.get("estimated"),
            "actual_departure": departure.get("actual"),
            "departure_delay_minutes": departure.get("delay"),
            "scheduled_arrival": arrival.get("scheduled"),
            "estimated_arrival": arrival.get("estimated"),
            "actual_arrival": arrival.get("actual"),
            "arrival_delay_minutes": arrival.get("delay"),
        }

    async def get_booking_flight_status(self, booking) -> dict | None:
        """
        Retrieve real flight status using an existing TravelRescue booking.

        The booking should contain:
        - external_reference: flight number, e.g. AI101
        - start_time: scheduled departure datetime
        - location: departure airport IATA
        - destination: arrival airport IATA
        """

        if not booking.external_reference:
            return None

        flight_number = booking.external_reference

        flight_date = None

        if booking.start_time is not None:
            flight_date = booking.start_time.date()

        return await self.get_flight_status(
            flight_number=flight_number,
            flight_date=flight_date,
            departure_iata=booking.location,
            arrival_iata=booking.destination,
        )
