from fastapi import (
    APIRouter,
    HTTPException,
    Request
)

from backend.models import Place, PlacesResponse

# Uses APIRouter so this module has no dependency on main.py
router = APIRouter()


@router.get("/places", response_model=PlacesResponse)
async def get_places(region: str, request: Request) -> PlacesResponse:
    """
    Full place details for a single region — /select and /refine only
    return {id, reason} pairs, so the frontend calls this once per
    locked region and joins the results locally by id to render map
    pins and place cards.

    Args:
        region (str): The region to return places for.
        request (Request): The incoming request, used to access the loaded dataset on app.state.

    Returns:
        PlacesResponse: The places belonging to the given region.
    """
    places: list[Place] = request.app.state.places
    known_regions: list[str] = request.app.state.known_regions

    if region not in known_regions:
        raise HTTPException(status_code=400, detail=f"Unknown region: {region!r}")

    filtered_places = [p for p in places if p.region == region]
    return PlacesResponse(places=filtered_places)
