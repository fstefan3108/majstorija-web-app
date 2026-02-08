using Microsoft.AspNetCore.Mvc;
using WebProdavnica.Entities;
using WebProdavnica.DAL.Abstract;

namespace WebProdavnica.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CraftsmenController : ControllerBase
    {
        private readonly ICraftsmanRepository _craftsmanRepository;

        public CraftsmenController(ICraftsmanRepository craftsmanRepository)
        {
            _craftsmanRepository = craftsmanRepository;
        }

        // GET: api/craftsmen
        [HttpGet]
        public IActionResult GetAllCraftsmen()
        {
            var craftsmen = _craftsmanRepository.GetAll();
            return Ok(craftsmen);
        }

        // GET: api/craftsmen/5
        [HttpGet("{id}")]
        public IActionResult GetCraftsmanById(int id)
        {
            var craftsman = _craftsmanRepository.GetById(id);
            if (craftsman == null)
                return NotFound(new { message = "Craftsman not found" });

            return Ok(craftsman);
        }

        // GET: api/craftsmen/search?profession=plumber
        [HttpGet("search")]
        public IActionResult SearchCraftsmen([FromQuery] string profession, [FromQuery] string location)
        {
            var craftsmen = _craftsmanRepository.Search(profession, location);
            return Ok(craftsmen);
        }

        // POST: api/craftsmen
        [HttpPost]
        public IActionResult CreateCraftsman([FromBody] Craftsman craftsman)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var success = _craftsmanRepository.Add(craftsman);
            if (success)
                return CreatedAtAction(nameof(GetCraftsmanById), new { id = craftsman.Id }, craftsman);

            return BadRequest(new { message = "Failed to create craftsman" });
        }

        // PUT: api/craftsmen/5
        [HttpPut("{id}")]
        public IActionResult UpdateCraftsman(int id, [FromBody] Craftsman craftsman)
        {
            if (id != craftsman.Id)
                return BadRequest(new { message = "ID mismatch" });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var success = _craftsmanRepository.Update(craftsman);
            if (success)
                return Ok(craftsman);

            return NotFound(new { message = "Craftsman not found" });
        }

        // DELETE: api/craftsmen/5
        [HttpDelete("{id}")]
        public IActionResult DeleteCraftsman(int id)
        {
            var success = _craftsmanRepository.Delete(id);
            if (success)
                return NoContent();

            return NotFound(new { message = "Craftsman not found" });
        }
    }
}